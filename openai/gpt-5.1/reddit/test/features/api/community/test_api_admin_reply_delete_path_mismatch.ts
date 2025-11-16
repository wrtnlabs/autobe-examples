import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that adminUser reply deletion enforces post/comment/reply path
 * consistency.
 *
 * Business goal: Ensure that the administrative DELETE endpoint for comment
 * replies does not allow cross-post or cross-comment deletions via mismatched
 * path parameters, and that it only succeeds when the provided postId,
 * commentId, and replyId reflect the actual hierarchy.
 *
 * Scenario steps:
 *
 * 1. Register a member user (Author A) and authenticate.
 * 2. As Author A, create a community.
 * 3. Create a membership for Author A in that community.
 * 4. Create two posts (postA, postB) in that community.
 * 5. Under postA, create a top-level comment (commentA).
 * 6. Under postA/commentA, create a reply (reply).
 * 7. Register an admin user and authenticate as admin.
 * 8. As admin, attempt to delete the reply with mismatched path parameters:
 *
 *    - Using postB.id with commentA.id and reply.id.
 *    - Using a random commentId that does not own reply.id under postA. Both
 *         attempts must fail with an HttpError.
 * 9. As admin, delete the reply with the correct (postA.id, commentA.id, reply.id)
 *    path parameters; this must succeed.
 * 10. Attempt to delete the same reply again with the correct path; this must now
 *     fail, demonstrating that the reply is gone.
 */
export async function test_api_admin_reply_delete_path_mismatch(
  connection: api.IConnection,
) {
  // 1. Register member user (Author A)
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://community.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as Author A
  const communitySlug = RandomGenerator.alphabets(12);
  const communityCreateBody = {
    slug: communitySlug,
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

  // 3. Create a membership for Author A in this community
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

  // 4. Create two posts in that community
  const postCommon = {
    communityId: community.id,
    communityCode: community.slug,
  } as const;

  const postABody = {
    ...postCommon,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postABody,
    });
  typia.assert(postA);

  const postBBody = {
    ...postCommon,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 6 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBBody,
    });
  typia.assert(postB);

  // 5. Under postA, create a top-level comment
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentCreateBody,
      },
    );
  typia.assert(commentA);

  // 6. Under postA/commentA, create a reply
  const replyCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    format: RandomGenerator.pick(["plain", "markdown"] as const),
    replyContext: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: postA.id,
        commentId: commentA.id,
        body: replyCreateBody,
      },
    );
  typia.assert(reply);

  // Basic sanity: reply should reference the same post and parent comment
  TestValidator.equals("reply post id matches postA", reply.post.id, postA.id);
  TestValidator.equals(
    "reply parent comment id matches commentA",
    reply.parent_comment.id,
    commentA.id,
  );

  // 7. Register an admin user (join also authenticates as admin)
  const adminUsername = RandomGenerator.name(1);
  const adminEmail = `${RandomGenerator.alphabets(10)}@admin.example.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail as string & tags.Format<"email">,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. As admin, attempt to delete the reply with mismatched path parameters

  // 8-1. Mismatched postId: use postB.id with commentA.id and reply.id
  await TestValidator.error(
    "admin delete with wrong postId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
        connection,
        {
          postId: postB.id,
          commentId: commentA.id,
          replyId: reply.id,
        },
      );
    },
  );

  // 8-2. Mismatched commentId: use random commentId under correct postA
  const wrongCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin delete with wrong commentId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
        connection,
        {
          postId: postA.id,
          commentId: wrongCommentId,
          replyId: reply.id,
        },
      );
    },
  );

  // 9. Correct delete must succeed
  await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
    connection,
    {
      postId: postA.id,
      commentId: commentA.id,
      replyId: reply.id,
    },
  );

  // 10. Second delete with the same correct path should now fail
  await TestValidator.error(
    "second delete of same reply should fail after it has been removed",
    async () => {
      await api.functional.communityPlatform.adminUser.posts.comments.replies.erase(
        connection,
        {
          postId: postA.id,
          commentId: commentA.id,
          replyId: reply.id,
        },
      );
    },
  );
}
