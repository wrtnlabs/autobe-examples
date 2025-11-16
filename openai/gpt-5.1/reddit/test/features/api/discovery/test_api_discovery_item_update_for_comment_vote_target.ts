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
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate updating a discovery item that targets a comment vote.
 *
 * Business goal
 *
 * - Ensure an adminUser can reprioritize and reschedule a discovery candidate
 *   whose logical target is a comment vote aggregate, after the full community
 *   interaction chain (community → membership → post → comment → comment vote)
 *   has been satisfied.
 * - Verify that only the adminUser actor can manage discovery inventory while the
 *   memberUser actor performs community interactions.
 *
 * High level flow
 *
 * 1. Register and authenticate a memberUser (this also yields an authorized
 *    context).
 * 2. Using the memberUser context, create a community.
 * 3. Join that community as the same memberUser.
 * 4. Create a post in that community.
 * 5. Create a top-level comment on the post.
 * 6. Cast a vote on that comment (direction "up").
 * 7. Register and authenticate an adminUser (authorized admin context).
 * 8. As adminUser, create a discovery item whose target points at the comment vote
 *    aggregate by configuring ICommunityPlatformDiscoveryItem.ICreate with:
 *
 *    - Target_type set to some vote-related marker (for example, "comment_vote")
 *    - Target_id set to the UUID of the voted comment (we use the comment.id here
 *         because the comment vote DTO only exposes comment_id and aggregates,
 *         not a standalone vote id)
 *    - A concrete context string (e.g., "comment_vote_experiments")
 *    - A reasonable priority_score
 *    - Start_at and end_at using ISO date-time strings (Date.toISOString())
 *    - Status set to a schedulable value such as "scheduled" or "active".
 * 9. Capture the created discovery item and assert its shape with typia.assert.
 * 10. Still as adminUser, call the update endpoint to change several mutable fields
 *     via ICommunityPlatformDiscoveryItem.IUpdate:
 *
 *     - Increase priority_score
 *     - Switch status (e.g., from "scheduled" to "active" or from "active" to
 *           "paused")
 *     - Shift the start_at and end_at window (e.g., move start into the past and end
 *           further into the future).
 * 11. Assert the update succeeds and validate:
 *
 *     - Id remains identical between pre- and post-update discovery items.
 *     - Target_type and target_id remain unchanged (still pointing to the same
 *           underlying comment vote/ comment).
 *     - Updated priority_score, status, and time window reflect the new values.
 *     - Created_at is unchanged while updated_at is either changed or at least
 *           present as a valid date-time string.
 *
 * Technical details & data generation
 *
 * - Use typia.random and RandomGenerator helpers to construct valid DTO bodies:
 *
 *   - Member join/login:
 *
 *       - ICommunityPlatformMemberuser.IJoin and ICommunityPlatformMemberuser.ILogin
 *               must satisfy documented constraints (e.g., username min/max
 *               length, email format, password length). For simplicity, we
 *               reuse typia.random where available or construct explicit
 *               strings that satisfy constraints.
 *   - Community creation:
 *
 *       - ICommunityPlatformCommunity.ICreate requires slug, name, visibility, status,
 *               nsfw/quarantine flags, and posting configuration booleans.
 *   - Membership creation:
 *
 *       - ICommunityPlatformCommunityMembership.ICreate needs role and optional
 *               approval/ban flags.
 *   - Post creation:
 *
 *       - ICommunityPlatformPost.ICreate requires communityId, communityCode, title,
 *               and may provide body/url/postType.
 *   - Comment creation:
 *
 *       - ICommunityPlatformComment.ICreate requires non-empty content and optional
 *               parentCommentId.
 *   - Comment vote creation:
 *
 *       - ICommunityPlatformCommentVote.ICreate must specify a direction string such as
 *               "up".
 *   - Discovery item creation/update:
 *
 *       - ICommunityPlatformDiscoveryItem.ICreate/IUpdate must not invent fields.
 *       - Use start_at/end_at with Date.toISOString() and a numeric priority_score.
 *
 * Assertions and validation
 *
 * - Use typia.assert(response) for every non-void API response to ensure full
 *   type validation; no additional type checks are needed.
 * - Use TestValidator.equals/TestValidator.notEquals/TestValidator.predicate with
 *   descriptive titles for business-logic assertions, such as:
 *
 *   - Discovery item id stability
 *   - Unchanged target_type/target_id between create and update
 *   - Changed priority_score and status
 *   - Scheduling window changes (start_at/end_at).
 * - Do not perform tests that intentionally cause type errors or invalid DTO
 *   shapes.
 *
 * Role handling
 *
 * - Authentication headers are managed by the SDK; never mutate
 *   connection.headers directly in the test.
 * - To switch actors:
 *
 *   - First, join/login as memberUser and run all memberUser operations.
 *   - Then join/login as adminUser and perform discovery item operations.
 *   - If needed, use explicit login calls again to ensure the correct actor when
 *       transitioning between segments.
 */
export async function test_api_discovery_item_update_for_comment_vote_target(
  connection: api.IConnection,
) {
  // 1. Register memberUser (join) to obtain authorized context
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;
  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as memberUser
  const communitySlug = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
    name: `Community ${RandomGenerator.name(2)}`,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Join community as memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: `Post ${RandomGenerator.name(3)}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a top-level comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 6. Cast an upvote on the comment
  const voteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteCreateBody,
      },
    );
  typia.assert(vote);

  // 7. Register adminUser and ensure admin auth context
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphabets(6)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPass123!", // satisfies password format
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // To be explicit, perform an admin login as well (actor switching test)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 8. Create discovery item targeting the comment vote (by comment id)
  const now = new Date();
  const startAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const endAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const discoveryCreateBody = {
    target_type: "comment_vote",
    target_id: comment.id,
    context: "comment_vote_experiments",
    priority_score: 10,
    start_at: startAt,
    end_at: endAt,
    status: "scheduled",
  } satisfies ICommunityPlatformDiscoveryItem.ICreate;
  const discoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.create(
      connection,
      {
        body: discoveryCreateBody,
      },
    );
  typia.assert(discoveryItem);

  // 9. Prepare new scheduling and priority for update
  const updatedStartAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const updatedEndAt = new Date(
    now.getTime() + 2 * 60 * 60 * 1000,
  ).toISOString();

  const discoveryUpdateBody = {
    // Do not modify target_type/target_id to validate stability
    priority_score: discoveryItem.priority_score + 5,
    context: discoveryItem.context ?? "comment_vote_experiments",
    start_at: updatedStartAt,
    end_at: updatedEndAt,
    status: discoveryItem.status === "scheduled" ? "active" : "paused",
  } satisfies ICommunityPlatformDiscoveryItem.IUpdate;

  const updatedDiscoveryItem: ICommunityPlatformDiscoveryItem =
    await api.functional.communityPlatform.adminUser.discovery.items.update(
      connection,
      {
        discoveryItemId: discoveryItem.id,
        body: discoveryUpdateBody,
      },
    );
  typia.assert(updatedDiscoveryItem);

  // 10. Business assertions
  TestValidator.equals(
    "discovery item id must remain stable after update",
    updatedDiscoveryItem.id,
    discoveryItem.id,
  );

  TestValidator.equals(
    "target_type must remain unchanged for comment vote discovery item",
    updatedDiscoveryItem.target_type,
    discoveryItem.target_type,
  );

  TestValidator.equals(
    "target_id must continue pointing to the same comment for vote-based item",
    updatedDiscoveryItem.target_id,
    discoveryItem.target_id,
  );

  TestValidator.predicate(
    "priority_score should increase after admin reprioritization",
    updatedDiscoveryItem.priority_score > discoveryItem.priority_score,
  );

  TestValidator.notEquals(
    "status should change after admin status transition (e.g., scheduled → active)",
    updatedDiscoveryItem.status,
    discoveryItem.status,
  );

  TestValidator.equals(
    "start_at should be updated to new scheduling window",
    updatedDiscoveryItem.start_at ?? null,
    discoveryUpdateBody.start_at ?? null,
  );

  TestValidator.equals(
    "end_at should be updated to new scheduling window",
    updatedDiscoveryItem.end_at ?? null,
    discoveryUpdateBody.end_at ?? null,
  );

  // Ensure created_at is stable while updated_at reflects a later or equal time
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedDiscoveryItem.created_at,
    discoveryItem.created_at,
  );

  TestValidator.predicate(
    "updated_at should be present on updated discovery item",
    typeof updatedDiscoveryItem.updated_at === "string" &&
      updatedDiscoveryItem.updated_at.length > 0,
  );
}
