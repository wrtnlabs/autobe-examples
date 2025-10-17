import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentNode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentNode";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Publicly retrieve the full comment tree for a post with nested replies.
 *
 * Business goal:
 *
 * - Ensure GET /communityPlatform/posts/{postId}/comments is publicly accessible
 *   (no auth header) for a public community and returns a correct tree.
 *
 * Steps:
 *
 * 1. Join as a member to seed data (community, post, comments).
 * 2. Create a public community.
 * 3. Create a TEXT post in the community.
 * 4. Seed comments: two roots (C1, C2) and a child reply (R1) under C1.
 * 5. Create an extra post with a comment to verify isolation.
 * 6. Call the GET tree endpoint with an unauthenticated connection.
 *
 * Validations:
 *
 * - Tree.post_id equals target post.id
 * - Root nodes contain C1 and C2; C1 has child R1 with correct parent_id
 * - All returned comments are authored by the seeding member
 * - All returned comments reference the same post id
 * - Isolation: comment from another post is not included
 */
export async function test_api_comment_tree_public_access_with_nesting(
  connection: api.IConnection,
) {
  // 1) Join as member (seed author)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: `P@ssw0rd${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const member: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create a public community
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const textPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: textPostBody },
    );
  typia.assert(post);

  // 4) Seed comments under the post
  const c1Body = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const c1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: c1Body },
    );
  typia.assert(c1);

  const r1Body = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
    parent_id: c1.id,
  } satisfies ICommunityPlatformComment.ICreate;
  const r1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: r1Body },
    );
  typia.assert(r1);

  const c2Body = {
    body: RandomGenerator.paragraph({ sentences: 7 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const c2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: c2Body },
    );
  typia.assert(c2);

  // 5) Isolation: another post + comment that must not appear in the first tree
  const otherPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const otherPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: otherPostBody },
    );
  typia.assert(otherPost);

  const otherCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const otherComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: otherPost.id, body: otherCommentBody },
    );
  typia.assert(otherComment);

  // 6) Public read with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const tree: ICommunityPlatformComment.ITree =
    await api.functional.communityPlatform.posts.comments.index(unauthConn, {
      postId: post.id,
    });
  typia.assert(tree);

  // Validations
  TestValidator.equals(
    "tree.post_id equals target post.id",
    tree.post_id,
    post.id,
  );

  // Find root nodes for C1 and C2
  const nodeC1 = tree.items.find((n) => n.comment.id === c1.id);
  TestValidator.predicate("root contains C1", nodeC1 !== undefined);
  if (nodeC1 === undefined) throw new Error("C1 node not found in root");

  const nodeC2 = tree.items.find((n) => n.comment.id === c2.id);
  TestValidator.predicate("root contains C2", nodeC2 !== undefined);
  if (nodeC2 === undefined) throw new Error("C2 node not found in root");

  // C1 should be a root (no parent)
  TestValidator.predicate(
    "C1 is top-level (no parent_id)",
    nodeC1.comment.parent_id === null || nodeC1.comment.parent_id === undefined,
  );

  // R1 should be a child under C1 with correct parent_id
  const childR1 = nodeC1.children.find((ch) => ch.comment.id === r1.id);
  TestValidator.predicate("C1 children contain R1", childR1 !== undefined);
  if (childR1 === undefined) throw new Error("R1 child not found under C1");
  TestValidator.equals(
    "R1.parent_id equals C1.id",
    childR1.comment.parent_id,
    c1.id,
  );

  // Authors must match the seeding member
  TestValidator.equals(
    "C1 author equals joined member",
    nodeC1.comment.community_platform_user_id,
    member.id,
  );
  TestValidator.equals(
    "C2 author equals joined member",
    nodeC2.comment.community_platform_user_id,
    member.id,
  );
  TestValidator.equals(
    "R1 author equals joined member",
    childR1.comment.community_platform_user_id,
    member.id,
  );

  // All nodes in tree belong to the same post
  function everyNodeMatchesPost(
    nodes: ICommunityPlatformCommentNode[],
  ): boolean {
    return nodes.every(
      (nd) =>
        nd.comment.community_platform_post_id === post.id &&
        everyNodeMatchesPost(nd.children),
    );
  }
  TestValidator.predicate(
    "every node references the target post",
    everyNodeMatchesPost(tree.items),
  );

  // Isolation: ensure otherPost's comment does not appear
  function collectIds(nodes: ICommunityPlatformCommentNode[]): string[] {
    return nodes.flatMap((nd) => [nd.comment.id, ...collectIds(nd.children)]);
  }
  const allIds = collectIds(tree.items);
  TestValidator.predicate(
    "tree does not contain comment from other post",
    allIds.includes(otherComment.id) === false,
  );
}
