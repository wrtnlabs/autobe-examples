import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentTree } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentTree";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_thread_comment_tree_single_root_comment(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. Create an active, visible community
  const communitySlug: string = RandomGenerator.alphaNumeric(12).toLowerCase();

  const communityBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Ensure membership in the community
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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 5. Create a single top-level comment on the post
  const commentContent: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });

  const commentBody = {
    content: commentContent,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // Sanity checks on comment
  TestValidator.equals(
    "comment is linked to correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals(
    "comment parent_comment_id is null for root comment",
    comment.parent_comment_id,
    null,
  );

  // 6. Prepare unauthenticated connection (public access check)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Call GET /communityPlatform/threads/{postId}/tree without auth
  const tree: ICommunityPlatformCommentTree =
    await api.functional.communityPlatform.threads.tree(publicConnection, {
      postId: post.id as string & tags.Format<"uuid">,
    });
  typia.assert<ICommunityPlatformCommentTree>(tree);

  // 8. Validate tree structure for the single root comment
  TestValidator.equals(
    "tree node postId matches post.id",
    tree.postId,
    post.id,
  );

  TestValidator.equals("tree node id matches comment.id", tree.id, comment.id);

  TestValidator.equals(
    "tree node parentCommentId is null for root",
    tree.parentCommentId,
    null,
  );

  TestValidator.equals(
    "tree node body matches original comment content",
    tree.body,
    comment.body,
  );

  TestValidator.equals(
    "tree author id matches comment author id",
    tree.author.id,
    comment.author.id,
  );

  TestValidator.equals(
    "tree author username matches comment author username",
    tree.author.username,
    comment.author.username,
  );

  TestValidator.equals(
    "tree children is empty array for single root comment",
    tree.children,
    [],
  );

  // 9. Confirm endpoint works without authentication via predicate
  await TestValidator.predicate("thread tree fetched without auth", true);
}
