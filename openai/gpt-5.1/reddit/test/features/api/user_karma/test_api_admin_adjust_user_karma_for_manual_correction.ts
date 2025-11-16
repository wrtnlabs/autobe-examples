import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Admin can manually correct a member user's aggregated karma record.
 *
 * Business goal
 *
 * - Ensure that privileged adminUser actors can directly adjust a member user's
 *   aggregate karma (postKarma, commentKarma, totalKarma) via the
 *   /communityPlatform/adminUser/userKarmas/{userKarmaId} endpoint.
 * - Validate that such corrections apply cleanly on top of previously accumulated
 *   activity and do not accidentally alter identity or lifecycle fields like
 *   memberUserId or createdAt.
 *
 * High-level flow
 *
 * 1. Bootstrap two actors: a memberUser (content author) and an adminUser
 *    (privileged operator).
 * 2. As memberUser, create a community and join it (membership) so the member can
 *    post.
 * 3. As memberUser, create a post in that community, then create a comment on the
 *    post.
 * 4. As memberUser, cast votes on the post and on the comment to ensure
 *    voting-related aggregates are exercised.
 * 5. As memberUser, create a community subscription to mark active participation.
 * 6. Obtain an existing userKarma aggregate record for this member user (because
 *    the only exposed write is adminUser/userKarmas.update and there is no
 *    dedicated read or create endpoint within the provided SDK, we rely on the
 *    mockup-style random() path: calling update with a known userKarmaId and
 *    typia.random<ICommunityPlatformUserKarma.IUpdate>() first to materialize a
 *    real record, then using its response as the "original" state to compare
 *    against when doing a second, controlled update).
 * 7. As adminUser, call PUT /communityPlatform/adminUser/userKarmas/{userKarmaId}
 *    again with a precise ICommunityPlatformUserKarma.IUpdate payload that
 *    simulates a moderation correction: e.g., reduce postKarma to account for
 *    removed fraudulent upvotes, slightly adjust commentKarma, and recompute
 *    totalKarma accordingly.
 * 8. Validate that the response reflects the new numeric values exactly and that
 *    identity and lifecycle fields remain consistent.
 *
 * Implementable adaptation vs. original scenario
 *
 * - The original scenario mentions "Retrieve the current aggregate values via an
 *   appropriate read endpoint". No read endpoint for user karma is provided in
 *   the SDK list, so we adapt as follows while preserving the spirit of the
 *   test:
 *
 *   - First, perform an adminUser.userKarmas.update call with a random but
 *       structurally valid IUpdate payload to obtain an initial
 *       ICommunityPlatformUserKarma record (this is equivalent to having some
 *       pre-existing aggregate state).
 *   - Then, treat that returned object as the baseline state for our business
 *       assertions and perform a second, explicit update with deterministic
 *       values.
 *   - This ensures type-correct, compilable code using only available endpoints
 *       while still testing that admin-driven corrections fully control the
 *       aggregate counters and preserve identity fields.
 *
 * Detailed steps
 *
 * 1. Member user registration and login
 *
 *    - Call api.functional.auth.memberUser.join with a well-formed
 *         ICommunityPlatformMemberuser.IJoin body.
 *    - Inspect the returned ICommunityPlatformMemberuser.IAuthorized to grab the
 *         member user's id and to ensure the SDK has attached a memberUser
 *         token into connection.headers.
 * 2. Admin user registration and login
 *
 *    - Call api.functional.auth.adminUser.join with a valid
 *         ICommunityPlatformAdminUserJoin.IRequest payload.
 *    - The response ICommunityPlatformAdminuser.IAuthorized yields an admin account
 *         and injects the admin token into connection.headers.
 *    - We'll keep track of admin credentials (identifier, password) so we can log
 *         back in after acting as memberUser.
 * 3. Switch to memberUser session
 *
 *    - Call api.functional.auth.memberUser.login using the member user's username or
 *         email as identifier plus password and href/referrer metadata; after
 *         this, the connection is authenticated as memberUser.
 * 4. Create community as memberUser
 *
 *    - Prepare ICommunityPlatformCommunity.ICreate with realistic slug, name,
 *         description, visibility, status, and feature flags.
 *    - Call api.functional.communityPlatform.memberUser.communities.create.
 *    - Assert the returned ICommunityPlatformCommunity and record community.id and
 *         community.slug.
 * 5. Join the community (membership)
 *
 *    - Call api.functional.communityPlatform.memberUser.communities.memberships.create
 *         with communitySlug and ICommunityPlatformCommunityMembership.ICreate
 *         where role is "member" and approval/banned flags default to
 *         reasonable values.
 *    - Assert the returned ICommunityPlatformCommunityMembership and confirm its
 *         memberUser.id matches the authenticated member and community.slug
 *         matches the created community.
 * 6. Create post as memberUser
 *
 *    - Build an ICommunityPlatformPost.ICreate body with communityId set to
 *         community.id, communityCode set to community.slug, a random but
 *         deterministic title and body, and postType e.g. "text".
 *    - Call api.functional.communityPlatform.memberUser.posts.create and assert the
 *         returned ICommunityPlatformPost.
 * 7. Create comment on the post
 *
 *    - Prepare ICommunityPlatformComment.ICreate with a meaningful content string
 *         and no parentCommentId (top-level comment).
 *    - Call api.functional.communityPlatform.memberUser.posts.comments.create with
 *         postId = post.id and the ICreate body.
 *    - Assert the resulting ICommunityPlatformComment and ensure its post.id matches
 *         the created post.
 * 8. Cast votes to exercise karma-related functionality (post and comment)
 *
 *    - For the post: call
 *         api.functional.communityPlatform.memberUser.posts.votes.create with
 *         postId = post.id and body.direction = "up".
 *    - For the comment: call
 *         api.functional.communityPlatform.memberUser.comments.votes.create
 *         with commentId = comment.id and body.direction = "up" as well.
 *    - Assert the returned ICommunityPlatformPostVote and
 *         ICommunityPlatformCommentVote just to ensure the vote endpoints
 *         operate normally; actual karma aggregation is a backend concern but
 *         this simulates a realistic source of karma changes.
 * 9. Create a community subscription for the member user
 *
 *    - Call api.functional.communityPlatform.memberUser.members.subscriptions.create
 *         with memberUserId = member.id and
 *         ICommunityPlatformCommunitySubscription.ICreate specifying the target
 *         community and reasonable is_active/receive_notifications flags.
 *    - Assert the returned ICommunityPlatformCommunitySubscription and verify its
 *         memberUser.id and community.slug.
 * 10. Switch back to adminUser session
 *
 *     - Call api.functional.auth.adminUser.login using the stored admin credentials
 *           to re-attach an admin token to connection.headers.
 * 11. Obtain a baseline user karma record for the member user
 *
 *     - There is no direct read endpoint for user karma, but
 *           api.functional.communityPlatform.adminUser.userKarmas.update
 *           returns an ICommunityPlatformUserKarma when called with a
 *           userKarmaId.
 *     - To stay within available APIs and keep the test compilable, we:
 *
 *               - Generate a deterministic userKarmaId using typia.random<string &
 *                           tags.Format<"uuid">>().
 *               - Call update once with that userKarmaId and a random
 *                           ICommunityPlatformUserKarma.IUpdate body
 *                           (typia.random<ICommunityPlatformUserKarma.IUpdate>()).
 *               - Treat the returned ICommunityPlatformUserKarma as our "existing" aggregate
 *                           state; record its id, memberUserId, totalKarma,
 *                           postKarma, commentKarma, createdAt, updatedAt,
 *                           deletedAt.
 *     - This effectively materializes a record that we will then adjust in a second,
 *           controlled update.
 * 12. Admin performs manual karma correction
 *
 *     - Based on the baseline aggregate from step 11, compute new values:
 *
 *               - NewPostKarma = baseline.postKarma - 5 (simulating removal of fraudulent
 *                           upvotes), but not less than a small floor such as 0.
 *               - NewCommentKarma = baseline.commentKarma + 3 (rewarding helpful comments).
 *               - NewTotalKarma = newPostKarma + newCommentKarma (maintaining a simple
 *                           invariance that total equals sum of the components
 *                           within this test).
 *     - Build an ICommunityPlatformUserKarma.IUpdate body using these three computed
 *           values and call
 *           api.functional.communityPlatform.adminUser.userKarmas.update with
 *           userKarmaId = baseline.id.
 *     - Capture the resulting ICommunityPlatformUserKarma as "corrected".
 * 13. Assertions and invariants
 *
 *     - Type assertions: use typia.assert() on all major responses (memberUser,
 *           adminUser, community, membership, post, comment, votes,
 *           subscription, baselineKarma, correctedKarma).
 *     - Identity invariants:
 *
 *               - TestValidator.equals("memberUserId should remain the same",
 *                           corrected.memberUserId, baseline.memberUserId).
 *               - TestValidator.equals("karma record id should not change", corrected.id,
 *                           baseline.id).
 *     - Numeric fields:
 *
 *               - TestValidator.equals("postKarma is updated as requested",
 *                           corrected.postKarma, newPostKarma).
 *               - TestValidator.equals("commentKarma is updated as requested",
 *                           corrected.commentKarma, newCommentKarma).
 *               - TestValidator.equals("totalKarma matches sum of components",
 *                           corrected.totalKarma, newTotalKarma).
 *     - Timestamp behavior:
 *
 *               - TestValidator.equals("createdAt must remain unchanged", corrected.createdAt,
 *                           baseline.createdAt).
 *               - TestValidator.predicate("updatedAt must be equal or more recent", new
 *                           Date(corrected.updatedAt).getTime() >= new
 *                           Date(baseline.updatedAt).getTime()).
 *     - Soft deletion stability:
 *
 *               - TestValidator.equals("deletedAt should remain unchanged", corrected.deletedAt
 *                           ?? null, baseline.deletedAt ?? null).
 * 14. Error scenario (optional but feasible within type safety)
 *
 *     - We can also verify that the backend rejects clearly unreasonable adjustments
 *           while keeping types valid, such as an extremely negative postKarma
 *           value, by wrapping an additional update call in TestValidator.error
 *           with a body whose postKarma, commentKarma, or totalKarma violates
 *           documented numeric invariants (if we knew them).
 *     - However, since explicit numeric bounds are not described in the DTO comments
 *           and we must not rely on type mismatch or intentional validation
 *           failures without specification, we skip this to avoid flaky,
 *           backend-specific assumptions.
 *
 * All API calls use await, and all request bodies use `satisfies` with the
 * appropriate DTO types to maintain strict type safety. No additional imports
 * are added beyond the template, and we never touch connection.headers
 * directly—the SDK manages authentication tokens for us.
 */
export async function test_api_admin_adjust_user_karma_for_manual_correction(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register adminUser
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Switch to memberUser session via login
  const memberLoginBody = {
    identifier: memberAuthorized.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILogin;
  const memberLoginResult: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginResult);

  // 4. Create community as memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Create membership in the community
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership memberUser id matches joined member",
    membership.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  // 6. Create post as memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community id should match parent community",
    post.community_id,
    community.id,
  );

  // 7. Create top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post summary id matches post id",
    comment.post.id,
    post.id,
  );

  // 8. Cast votes on post and comment
  const upDirection = "up" as string;
  const postVoteBody = {
    direction: upDirection,
  } satisfies ICommunityPlatformPostVote.ICreate;
  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteBody,
      },
    );
  typia.assert(postVote);
  TestValidator.equals(
    "post vote post_id matches post.id",
    postVote.post_id,
    post.id,
  );

  const commentVoteBody = {
    direction: upDirection,
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: commentVoteBody,
      },
    );
  typia.assert(commentVote);
  TestValidator.equals(
    "comment vote comment_id matches comment.id",
    commentVote.comment_id,
    comment.id,
  );

  // 9. Create community subscription for the member user
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription memberUser id matches member",
    subscription.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "subscription community slug matches community",
    subscription.community.slug,
    community.slug,
  );

  // 10. Switch back to adminUser session
  const adminLoginBody = {
    identifier: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 11. Obtain baseline user karma by calling update once with random update body
  const initialUserKarmaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomKarmaUpdateBody =
    typia.random<ICommunityPlatformUserKarma.IUpdate>();
  const baselineKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId: initialUserKarmaId,
        body: randomKarmaUpdateBody,
      },
    );
  typia.assert(baselineKarma);

  // 12. Compute corrected karma values
  const baselinePostKarma = baselineKarma.postKarma;
  const baselineCommentKarma = baselineKarma.commentKarma;

  const decreaseAmount = 5;
  const increaseAmount = 3;

  const newPostKarmaNumber: number =
    baselinePostKarma - decreaseAmount >= 0
      ? baselinePostKarma - decreaseAmount
      : 0;
  const newPostKarma = newPostKarmaNumber satisfies number as number;

  const newCommentKarmaNumber: number = baselineCommentKarma + increaseAmount;
  const newCommentKarma = newCommentKarmaNumber satisfies number as number;

  const newTotalKarmaNumber: number =
    newPostKarmaNumber + newCommentKarmaNumber;
  const newTotalKarma = newTotalKarmaNumber satisfies number as number;

  const correctionBody = {
    postKarma: newPostKarma,
    commentKarma: newCommentKarma,
    totalKarma: newTotalKarma,
  } satisfies ICommunityPlatformUserKarma.IUpdate;

  const correctedKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId: baselineKarma.id,
        body: correctionBody,
      },
    );
  typia.assert(correctedKarma);

  // 13. Assertions
  // Identity invariants
  TestValidator.equals(
    "karma record id should remain unchanged",
    correctedKarma.id,
    baselineKarma.id,
  );
  TestValidator.equals(
    "memberUserId should remain unchanged",
    correctedKarma.memberUserId,
    baselineKarma.memberUserId,
  );

  // Numeric fields reflect correction
  TestValidator.equals(
    "postKarma is updated as requested",
    correctedKarma.postKarma,
    newPostKarma,
  );
  TestValidator.equals(
    "commentKarma is updated as requested",
    correctedKarma.commentKarma,
    newCommentKarma,
  );
  TestValidator.equals(
    "totalKarma equals sum of postKarma and commentKarma",
    correctedKarma.totalKarma,
    newTotalKarma,
  );

  // createdAt unchanged
  TestValidator.equals(
    "createdAt must remain unchanged after update",
    correctedKarma.createdAt,
    baselineKarma.createdAt,
  );

  // updatedAt is equal or more recent
  const baselineUpdatedAtTime = new Date(baselineKarma.updatedAt).getTime();
  const correctedUpdatedAtTime = new Date(correctedKarma.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt must be equal or more recent than before",
    correctedUpdatedAtTime >= baselineUpdatedAtTime,
  );

  // deletedAt unchanged
  const baselineDeletedAt: string | null = baselineKarma.deletedAt ?? null;
  const correctedDeletedAt: string | null = correctedKarma.deletedAt ?? null;
  TestValidator.equals(
    "deletedAt remains unchanged after karma correction",
    correctedDeletedAt,
    baselineDeletedAt,
  );
}
