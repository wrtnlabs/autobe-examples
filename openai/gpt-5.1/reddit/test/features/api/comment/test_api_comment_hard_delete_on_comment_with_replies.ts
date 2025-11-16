import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate hard deletion of a parent comment that has replies.
 *
 * Business context:
 *
 * - A member user creates a community, joins it, writes a post, and then starts a
 *   comment thread with a parent comment and a reply.
 * - An admin user then performs a hard delete against the parent comment using
 *   the erase endpoint which is described as physically removing the comment
 *   row from community_platform_comments.
 *
 * What this test validates:
 *
 * 1. Member-user flow:
 *
 *    - MemberUser can join (register) successfully.
 *    - MemberUser can create a community.
 *    - MemberUser can create a membership in that community.
 *    - MemberUser can create a post in the community.
 *    - MemberUser can create a parent comment on that post.
 *    - MemberUser can create a reply comment on that post whose parentCommentId
 *         references the parent comment.
 * 2. Admin-user flow:
 *
 *    - AdminUser can join (register) successfully.
 *    - While authenticated as adminUser, calling erase(postId, parentCommentId)
 *         completes without error, even though the parent has a child reply.
 * 3. Limitations:
 *
 *    - No comment listing or lookup API is provided in the SDK, so we cannot
 *         re-query the comments table to assert cascade effects. Instead, this
 *         test focuses on the happy-path success of the erase call under an
 *         admin context where the parent comment has replies.
 */
export async function test_api_comment_hard_delete_on_comment_with_replies(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authenticated member session.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community as the member user.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
  typia.assert(community);

  // 3. Create a membership in the community for the member user.
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

  // 4. Create a post in that community.
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

  // 5. Create a parent comment on the post.
  const parentCommentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentCreateBody,
      },
    );
  typia.assert(parentComment);

  // 6. Create a reply comment referencing the parent comment.
  const replyCommentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 1 }),
    parentCommentId: parentComment.id,
  } satisfies ICommunityPlatformComment.ICreate;

  const replyComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyCommentCreateBody,
      },
    );
  typia.assert(replyComment);

  TestValidator.predicate(
    "reply comment should reference parent comment id",
    replyComment.parent_comment_id === parentComment.id,
  );

  // 7. Register an admin user and obtain an admin session.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}-admin@example.com`,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminUser: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // 8. Hard-delete the parent comment as admin.
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: parentComment.id,
    },
  );

  // If we reach here without an error, we consider the delete successful.
  TestValidator.predicate(
    "erase should complete without throwing when parent comment has replies",
    true,
  );
}
