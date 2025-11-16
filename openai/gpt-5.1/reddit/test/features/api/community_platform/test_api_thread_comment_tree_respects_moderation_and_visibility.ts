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

/**
 * Validate that the public comment tree endpoint correctly reflects the comment
 * hierarchy and core visibility of active comments for a community post.
 *
 * ## Business context
 *
 * A registered member user can create communities, join them as a member,
 * create posts, and then comment on those posts (including nested replies). The
 * public-facing UI uses GET /communityPlatform/threads/{postId}/tree to
 * retrieve a hierarchical tree of comments suitable for rendering discussion
 * threads, including nested replies.
 *
 * This test focuses on the parts of the original scenario that can be
 * implemented with the provided SDK functions: creation of a community,
 * membership, a post, several comments (top-level and replies), and retrieval
 * of the comment tree. We then verify that the tree contains the created
 * comments, that parent/child relationships are preserved, and that fundamental
 * DTO shapes are correct. We intentionally do not attempt to drive moderation
 * or deletion flows because no such APIs are available in the provided function
 * list.
 *
 * ## High-level steps
 *
 * 1. Register and authenticate a member user via POST /auth/memberUser/join.
 * 2. Create a community via POST /communityPlatform/memberUser/communities.
 * 3. Establish a membership for that community for the same member user via POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Create a post in that community via POST /communityPlatform/memberUser/posts.
 * 5. Create multiple comments on that post via POST
 *    /communityPlatform/memberUser/posts/{postId}/comments:
 *
 *    - Two top-level comments (no parentCommentId).
 *    - One reply to the first top-level comment (with parentCommentId set).
 * 6. Call GET /communityPlatform/threads/{postId}/tree without modifying the
 *    connection, relying on the fact that the endpoint is documented as a
 *    generic thread read operation.
 * 7. Validate the following:
 *
 *    - Typia.assert passes on every response (join, community create, membership
 *         create, post create, comment create, tree fetch).
 *    - The comment tree’s postId matches the created post.id on every node.
 *    - All created comments appear somewhere in the tree, matched by id.
 *    - Top-level comments have parentCommentId null/undefined.
 *    - The reply comment has parentCommentId equal to its parent top-level comment
 *         id and appears as a child under that parent’s children array.
 *    - Author summary fields on the tree nodes correspond to the same member user
 *         who created the comments.
 */
export async function test_api_thread_comment_tree_respects_moderation_and_visibility(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (memberUser.join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(member);

  // 2. Create a community
  const communitySlug: string = RandomGenerator.alphaNumeric(12);
  const communityBody = {
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
      { body: communityBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community slug in response matches requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership for the community
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

  TestValidator.equals(
    "membership community slug matches created community",
    membership.community.slug,
    community.slug,
  );

  // 4. Create a post in the community
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
    "post community_id matches community.id",
    post.community_id,
    community.id,
  );

  // 5. Create comments on the post
  // Top-level comment 1
  const topComment1Body = {
    content:
      "Top-level comment 1: " + RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const topComment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: topComment1Body,
      },
    );
  typia.assert(topComment1);

  // Top-level comment 2
  const topComment2Body = {
    content:
      "Top-level comment 2: " + RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const topComment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: topComment2Body,
      },
    );
  typia.assert(topComment2);

  // Reply to top-level comment 1
  const replyTo1Body = {
    content:
      "Reply to comment 1: " + RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: topComment1.id,
  } satisfies ICommunityPlatformComment.ICreate;

  const replyTo1: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyTo1Body,
      },
    );
  typia.assert(replyTo1);

  // Sanity checks on created comments
  TestValidator.equals(
    "topComment1 is a top-level comment (no parent)",
    topComment1.parent_comment_id ?? null,
    null,
  );
  TestValidator.equals(
    "topComment2 is a top-level comment (no parent)",
    topComment2.parent_comment_id ?? null,
    null,
  );
  TestValidator.equals(
    "replyTo1 has parent_comment_id equal to topComment1.id",
    replyTo1.parent_comment_id,
    topComment1.id,
  );

  // 6. Fetch comment tree anonymously / as-is
  const tree: ICommunityPlatformCommentTree =
    await api.functional.communityPlatform.threads.tree(connection, {
      postId: post.id,
    });
  typia.assert(tree);

  // 7. Validate tree structure and contents
  // The tree root should correspond to a comment node structure; ensure its
  // postId matches the target post.
  TestValidator.equals(
    "root tree.postId matches post.id",
    tree.postId,
    post.id,
  );

  // Traverse tree to collect all comment ids and perform structural checks.
  const collectedIds: string[] = [];
  const childParentPairs: Array<{ childId: string; parentId: string | null }> =
    [];

  const traverse = (node: ICommunityPlatformCommentTree) => {
    collectedIds.push(node.id);
    childParentPairs.push({
      childId: node.id,
      parentId: node.parentCommentId ?? null,
    });
    // postId must be consistent on every node
    TestValidator.equals(
      "each node.postId matches post.id",
      node.postId,
      post.id,
    );
    // author summary should reference the same member id as the creator
    TestValidator.equals(
      "author id on node matches member.id",
      node.author.id,
      member.id,
    );
    node.children.forEach(traverse);
  };

  traverse(tree);

  // Ensure all created comments are present somewhere in the tree.
  TestValidator.predicate("topComment1 appears in tree", () =>
    collectedIds.includes(topComment1.id),
  );
  TestValidator.predicate("topComment2 appears in tree", () =>
    collectedIds.includes(topComment2.id),
  );
  TestValidator.predicate("replyTo1 appears in tree", () =>
    collectedIds.includes(replyTo1.id),
  );

  // Verify parent-child relationships recorded from traversal.
  const findPair = (id: string) =>
    childParentPairs.find((pair) => pair.childId === id) ?? null;

  const pair1 = findPair(topComment1.id);
  const pair2 = findPair(topComment2.id);
  const pairReply = findPair(replyTo1.id);

  TestValidator.equals(
    "topComment1 node has null parentCommentId",
    pair1?.parentId ?? null,
    null,
  );
  TestValidator.equals(
    "topComment2 node has null parentCommentId",
    pair2?.parentId ?? null,
    null,
  );
  TestValidator.equals(
    "replyTo1 node has parentCommentId equal to topComment1.id",
    pairReply?.parentId ?? null,
    topComment1.id,
  );

  // Additionally, confirm that replyTo1 is actually nested under topComment1
  // in the children hierarchy.
  const replyIsChildOfTop1 = (() => {
    let found = false;
    const search = (node: ICommunityPlatformCommentTree) => {
      if (node.id === topComment1.id) {
        if (node.children.some((child) => child.id === replyTo1.id)) {
          found = true;
        }
      }
      if (!found) node.children.forEach(search);
    };
    search(tree);
    return found;
  })();

  TestValidator.predicate(
    "replyTo1 is nested directly under topComment1.children",
    replyIsChildOfTop1,
  );
}
