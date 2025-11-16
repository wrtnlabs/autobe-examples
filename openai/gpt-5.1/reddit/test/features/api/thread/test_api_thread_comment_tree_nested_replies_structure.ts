import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReply";
import type { ICommunityPlatformCommentTree } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentTree";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate that the thread comment tree endpoint returns a properly nested
 * structure when a post has a top-level comment and a reply under that
 * comment.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a member user via auth.memberUser.join.
 * 2. Create a community via POST /communityPlatform/memberUser/communities using
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Join that community via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships so
 *    the user is an approved member.
 * 4. Create a post in that community via POST /communityPlatform/memberUser/posts
 *    using ICommunityPlatformPost.ICreate.
 * 5. Create a top-level comment for the post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments with
 *    ICommunityPlatformComment.ICreate and without parentCommentId.
 * 6. Create a reply under that comment via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments/{commentId}/replies
 *    using ICommunityPlatformCommentReply.ICreate.
 * 7. Call GET /communityPlatform/threads/{postId}/tree anonymously with the same
 *    connection (no extra auth calls).
 * 8. Assert that the returned ICommunityPlatformCommentTree represents the created
 *    top-level comment and that its children array contains the reply, with
 *    correct parentCommentId, author, and postId.
 * 9. Validate basic structural integrity: the tree root has parentCommentId ===
 *    null, its id matches the created comment id, children length matches
 *    number of replies created, and each child has parentCommentId equal to the
 *    root id and postId equal to the post id.
 */
export async function test_api_thread_comment_tree_nested_replies_structure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a membership in that community (so the member can participate)
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // Ensure membership is for the same community
  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post within the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id equals created community id",
    post.community_id,
    community.id,
  );

  // 5. Create a top-level comment on the post (no parentCommentId)
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Ensure top-level comment has null parent_comment_id
  TestValidator.equals(
    "top-level comment has no parent",
    comment.parent_comment_id,
    null,
  );

  // 6. Create a reply under that comment
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    format: "plain",
    replyContext: undefined,
  } satisfies ICommunityPlatformCommentReply.ICreate;

  const reply: ICommunityPlatformCommentReply =
    await api.functional.communityPlatform.memberUser.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply parent comment id matches root comment",
    reply.parent_comment.id,
    comment.id,
  );

  // 7. Call the thread tree endpoint anonymously (no extra auth changes needed)
  const tree: ICommunityPlatformCommentTree =
    await api.functional.communityPlatform.threads.tree(connection, {
      postId: post.id,
    });
  typia.assert(tree);

  // 8. Assert root node basics
  TestValidator.equals("tree postId matches post id", tree.postId, post.id);
  TestValidator.equals(
    "root comment id matches created top-level comment id",
    tree.id,
    comment.id,
  );
  TestValidator.equals(
    "root parentCommentId is null",
    tree.parentCommentId,
    null,
  );

  // 9. Children structure: there should be at least one child representing the reply
  TestValidator.predicate(
    "root has at least one child reply",
    tree.children.length >= 1,
  );

  const child = tree.children[0];

  TestValidator.equals(
    "child parentCommentId equals root id",
    child.parentCommentId,
    tree.id,
  );
  TestValidator.equals("child postId equals post id", child.postId, post.id);
  TestValidator.equals(
    "child author id equals reply author id",
    child.author.id,
    reply.author.id,
  );

  // Ensure that child itself has a children array consistent with type
  TestValidator.equals(
    "child children array is defined",
    Array.isArray(child.children),
    true,
  );
}
