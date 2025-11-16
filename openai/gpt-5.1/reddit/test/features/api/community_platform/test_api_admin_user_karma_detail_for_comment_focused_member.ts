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
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Validate adminUser-facing user karma detail for a comment-focused member
 * user.
 *
 * Business goal: Ensure that the admin-only endpoint GET
 * /communityPlatform/adminUser/userKarmas/{userKarmaId} correctly returns an
 * ICommunityPlatformUserKarma record whose numeric fields are internally
 * consistent and can represent a user whose reputation is dominated by
 * comment-based karma rather than post-based karma.
 *
 * End-to-end flow (adapted to available APIs):
 *
 * 1. Register and authenticate a memberUser.
 * 2. As that memberUser, create a community.
 * 3. Join the created community (create a community membership).
 * 4. Create a single post in that community to serve as the container for
 *    comments.
 * 5. Create multiple comments authored by the same memberUser on that post.
 * 6. Upvote those comments using the memberUser comment votes API to build
 *    comment-based karma; no explicit post votes are created in this test.
 * 7. Create a community subscription for the memberUser to mark them as an active
 *    follower of the community.
 * 8. Register and authenticate an adminUser to obtain an admin session.
 * 9. As the adminUser, invoke GET
 *    /communityPlatform/adminUser/userKarmas/{userKarmaId} via
 *    api.functional.communityPlatform.adminUser.userKarmas.at.
 *
 * Because this prompt does not include any search API to resolve the
 * userKarmaId for the just-created member, the test treats userKarmaId as an
 * opaque identifier and focuses on validating the structure and internal
 * numeric relationships of the returned ICommunityPlatformUserKarma object
 * rather than strict identity linkage.
 *
 * Validation points:
 *
 * - Typia.assert() succeeds on all responses, including the final
 *   ICommunityPlatformUserKarma object.
 * - CommentKarma is greater than or equal to postKarma, reflecting
 *   comment-focused activity (given we have only created comment votes in this
 *   scenario).
 * - TotalKarma is greater than or equal to both postKarma and commentKarma.
 * - TotalKarma is approximately postKarma + commentKarma within a small
 *   tolerance, acknowledging that the exact aggregation rules may include
 *   additional factors.
 * - All fields defined on ICommunityPlatformUserKarma (id, memberUserId,
 *   totalKarma, postKarma, commentKarma, createdAt, updatedAt, deletedAt) exist
 *   and have correct types as enforced by typia.assert.
 */
export async function test_api_admin_user_karma_detail_for_comment_focused_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as the memberUser
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Join the community (membership)
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

  // 4. Create a single post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create multiple comments on the post
  const comments: ICommunityPlatformComment[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const commentBody = {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        parentCommentId: undefined,
      } satisfies ICommunityPlatformComment.ICreate;

      const comment: ICommunityPlatformComment =
        await api.functional.communityPlatform.memberUser.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: commentBody,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  // 6. Upvote those comments to build comment-based karma
  await ArrayUtil.asyncForEach(comments, async (comment) => {
    const voteBody = {
      direction: "up",
    } satisfies ICommunityPlatformCommentVote.ICreate;

    const vote: ICommunityPlatformCommentVote =
      await api.functional.communityPlatform.memberUser.comments.votes.create(
        connection,
        {
          commentId: comment.id,
          body: voteBody,
        },
      );
    typia.assert(vote);
  });

  // 7. Create a community subscription for the memberUser
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

  // 8. Register an adminUser (which also authenticates the admin session)
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 9. Retrieve a user karma record as adminUser
  // Note: we do not have a search API to find the exact karma row for
  // memberAuthorized.id, so we use a random identifier and focus on the
  // structural and relational properties of the returned DTO.
  const userKarmaId: string = typia.random<string>();

  const karma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.adminUser.userKarmas.at(connection, {
      userKarmaId,
    });
  typia.assert(karma);

  // 10. Business-level numeric relationship assertions
  TestValidator.predicate(
    "commentKarma should be greater than or equal to postKarma (comment-focused)",
    karma.commentKarma >= karma.postKarma,
  );

  TestValidator.predicate(
    "totalKarma should be at least the max of its components",
    karma.totalKarma >= karma.commentKarma &&
      karma.totalKarma >= karma.postKarma,
  );

  const sumComponents = karma.commentKarma + karma.postKarma;
  const diff = Math.abs(karma.totalKarma - sumComponents);
  TestValidator.predicate(
    "totalKarma should approximately equal postKarma + commentKarma",
    diff <= 10,
  );
}
