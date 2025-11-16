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
 * Validate adminUser-driven user karma penalty adjustments.
 *
 * Business context: This test simulates a realistic moderation scenario where
 * an adminUser needs to penalize a member user's reputation by adjusting their
 * aggregated karma values. Although the full runtime aggregation from
 * posts/comments to karma is handled internally by the backend, this endpoint
 * provides an admin-only escape hatch for manual corrections or moderation
 * penalties.
 *
 * The test focuses on proving that:
 *
 * - An adminUser can authenticate and call the dedicated karma update endpoint.
 * - The endpoint correctly updates the aggregate fields (postKarma, commentKarma,
 *   totalKarma) according to the request body.
 * - Core invariants hold: the aggregate ID is stable, the memberUser linkage does
 *   not change, and updatedAt timestamps advance on each update.
 * - Repeated penalties can be applied without breaking consistency.
 *
 * Limitations and scenario adjustments:
 *
 * - There is no read API for user karma aggregates, so the test bootstraps an
 *   initial aggregate via the same update endpoint, then applies penalties on
 *   top of that state.
 * - The endpoint requires a userKarmaId, but there is no discover API; the test
 *   uses a deterministic UUID shape via typia.random<string &
 *   tags.Format<"uuid">>().
 * - The interaction steps that create posts, comments, votes, and community
 *   subscription serve as realistic context for the member user but are not
 *   wired into the karma aggregate directly in this test (due to missing
 *   linkage APIs). They still demonstrate multi-entity flows and role usage.
 */
export async function test_api_admin_reduce_user_karma_after_moderation_penalty(
  connection: api.IConnection,
) {
  // Helper builders for URLs and referrers
  const baseHref = "https://community.example.com/" as const;
  const joinHref = `${baseHref}auth/join`;
  const loginHref = `${baseHref}auth/login`;
  const communityHref = `${baseHref}communities/create`;

  // 1. Register adminUser (join)
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Adm1nPass!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorizedJoin);

  // 2. Register memberUser (join)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "M3mberPass!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: joinHref as string & tags.Format<"uri">,
    referrer: baseHref as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorizedJoin);

  const memberUserId: string & tags.Format<"uuid"> =
    memberAuthorizedJoin.id as string & tags.Format<"uuid">;

  // 3. As memberUser, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Create a membership for the member user in that community
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 5. Create a post in that community as memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 6. Create a comment on that post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 7. Create a subscription for the member user to the community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 8. Cast votes on post and comment as memberUser
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: postVoteCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(postVote);

  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentVoteCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommentVote>(commentVote);

  // 9. Login as adminUser to ensure admin token is active
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: loginHref as string & tags.Format<"uri">,
    referrer: baseHref as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorizedLogin);

  // 10. Bootstrap an initial user karma aggregate via the admin update endpoint
  const userKarmaId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const initialPostKarma = 20 as number & tags.Type<"int32">;
  const initialCommentKarma = 10 as number & tags.Type<"int32">;
  const initialTotalKarma = 30 as number & tags.Type<"int32">;

  const bootstrapBody = {
    postKarma: initialPostKarma,
    commentKarma: initialCommentKarma,
    totalKarma: initialTotalKarma,
  } satisfies ICommunityPlatformUserKarma.IUpdate;

  const bootstrapped: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId,
        body: bootstrapBody,
      },
    );
  typia.assert<ICommunityPlatformUserKarma>(bootstrapped);

  TestValidator.predicate(
    "bootstrapped karma is non-negative and matches initial values",
    () =>
      bootstrapped.postKarma >= 0 &&
      bootstrapped.commentKarma >= 0 &&
      bootstrapped.totalKarma >= 0 &&
      bootstrapped.postKarma === initialPostKarma &&
      bootstrapped.commentKarma === initialCommentKarma &&
      bootstrapped.totalKarma === initialTotalKarma,
  );

  TestValidator.equals(
    "bootstrapped id should equal userKarmaId path parameter",
    bootstrapped.id,
    userKarmaId,
  );

  const memberUserIdFromKarma: string & tags.Format<"uuid"> =
    bootstrapped.memberUserId as string & tags.Format<"uuid">;

  TestValidator.predicate(
    "memberUserId on karma is a UUID string",
    () =>
      typeof memberUserIdFromKarma === "string" &&
      memberUserIdFromKarma.length > 0,
  );

  // 11. Apply first penalty: reduce all karma values
  const penalizedPostKarma = 8 as number & tags.Type<"int32">;
  const penalizedCommentKarma = 4 as number & tags.Type<"int32">;
  const penalizedTotalKarma = 12 as number & tags.Type<"int32">;

  const firstPenaltyBody = {
    postKarma: penalizedPostKarma,
    commentKarma: penalizedCommentKarma,
    totalKarma: penalizedTotalKarma,
  } satisfies ICommunityPlatformUserKarma.IUpdate;

  const penalizedOnce: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId,
        body: firstPenaltyBody,
      },
    );
  typia.assert<ICommunityPlatformUserKarma>(penalizedOnce);

  TestValidator.equals(
    "first penalty: id remains equal to userKarmaId",
    penalizedOnce.id,
    userKarmaId,
  );
  TestValidator.equals(
    "first penalty: memberUserId remains stable",
    penalizedOnce.memberUserId,
    memberUserIdFromKarma,
  );

  TestValidator.predicate(
    "first penalty: karma values decreased and non-negative",
    () =>
      penalizedOnce.postKarma >= 0 &&
      penalizedOnce.commentKarma >= 0 &&
      penalizedOnce.totalKarma >= 0 &&
      penalizedOnce.postKarma === penalizedPostKarma &&
      penalizedOnce.commentKarma === penalizedCommentKarma &&
      penalizedOnce.totalKarma === penalizedTotalKarma &&
      penalizedOnce.postKarma < bootstrapped.postKarma &&
      penalizedOnce.commentKarma < bootstrapped.commentKarma &&
      penalizedOnce.totalKarma < bootstrapped.totalKarma,
  );

  const firstUpdatedAt = penalizedOnce.updatedAt;

  // 12. Apply second penalty: further reduction
  const secondPostKarma = 5 as number & tags.Type<"int32">;
  const secondCommentKarma = 2 as number & tags.Type<"int32">;
  const secondTotalKarma = 7 as number & tags.Type<"int32">;

  const secondPenaltyBody = {
    postKarma: secondPostKarma,
    commentKarma: secondCommentKarma,
    totalKarma: secondTotalKarma,
  } satisfies ICommunityPlatformUserKarma.IUpdate;

  const penalizedTwice: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.update(
      connection,
      {
        userKarmaId,
        body: secondPenaltyBody,
      },
    );
  typia.assert<ICommunityPlatformUserKarma>(penalizedTwice);

  TestValidator.equals(
    "second penalty: id remains equal to userKarmaId",
    penalizedTwice.id,
    userKarmaId,
  );
  TestValidator.equals(
    "second penalty: memberUserId remains stable across penalties",
    penalizedTwice.memberUserId,
    memberUserIdFromKarma,
  );

  TestValidator.predicate(
    "second penalty: karma values decreased again and non-negative",
    () =>
      penalizedTwice.postKarma >= 0 &&
      penalizedTwice.commentKarma >= 0 &&
      penalizedTwice.totalKarma >= 0 &&
      penalizedTwice.postKarma === secondPostKarma &&
      penalizedTwice.commentKarma === secondCommentKarma &&
      penalizedTwice.totalKarma === secondTotalKarma &&
      penalizedTwice.postKarma < penalizedOnce.postKarma &&
      penalizedTwice.commentKarma < penalizedOnce.commentKarma &&
      penalizedTwice.totalKarma < penalizedOnce.totalKarma,
  );

  TestValidator.predicate(
    "second penalty: updatedAt is greater than after first penalty",
    () => penalizedTwice.updatedAt > firstUpdatedAt,
  );
}
