import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_comments_reply } from "../../../generate/generate_random_community_hub_comments_reply";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

export async function test_api_comment_list_threaded_tree_with_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create post
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 5. Create top-level comments sequentially (c1 oldest, c3 newest)
  const c1 = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(c1);
  const c2 = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(c2);
  const c3 = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    { params: { postId: post.id } },
  );
  typia.assert(c3);
  // 6. Create nested replies at various depths
  const r1 = await generate_random_community_hub_comments_reply(
    memberConnection,
    { params: { commentId: c1.id } },
  );
  typia.assert(r1);
  const r1a = await generate_random_community_hub_comments_reply(
    memberConnection,
    { params: { commentId: r1.id } },
  );
  typia.assert(r1a);
  const r2 = await generate_random_community_hub_comments_reply(
    memberConnection,
    { params: { commentId: c2.id } },
  );
  typia.assert(r2);
  // 7. Retrieve comments with default (best) sorting
  const result = await api.functional.communityHub.posts.comments.list(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(result);
  // 8. Validate threaded tree structure
  const topLevel = result.childComments;
  TestValidator.predicate(
    "has three top-level comments",
    () => topLevel.length === 3,
  );
  // Best sorting: vote_score DESC, created_at DESC — all start at 0, so newest first
  TestValidator.predicate(
    "top-level sorted by best (c3 newest first, c1 oldest last)",
    () =>
      topLevel.length >= 3 &&
      topLevel[0].created_at > topLevel[1].created_at &&
      topLevel[1].created_at > topLevel[2].created_at,
  );
  // Helper to find a comment by ID within the nested tree
  const findInTree = (
    nodes: ICommunityHubComment.IList[],
    id: string,
  ): ICommunityHubComment.IList | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findInTree(node.childComments, id);
      if (found) return found;
    }
    return undefined;
  };
  const treeC1 = findInTree(topLevel, c1.id);
  const treeC2 = findInTree(topLevel, c2.id);
  const treeC3 = findInTree(topLevel, c3.id);
  TestValidator.predicate("c1 found in tree", () => treeC1 !== undefined);
  TestValidator.predicate("c2 found in tree", () => treeC2 !== undefined);
  TestValidator.predicate("c3 found in tree", () => treeC3 !== undefined);
  if (treeC1 && treeC2 && treeC3) {
    TestValidator.equals("c1 depth is 0", treeC1.depth, 0);
    TestValidator.equals("c2 depth is 0", treeC2.depth, 0);
    TestValidator.equals("c3 depth is 0", treeC3.depth, 0);
    // c1 should have r1 as child
    TestValidator.predicate("c1 has r1 as child comment", () =>
      treeC1.childComments.some((ch) => ch.id === r1.id),
    );
    // c2 should have r2 as child
    TestValidator.predicate("c2 has r2 as child comment", () =>
      treeC2.childComments.some((ch) => ch.id === r2.id),
    );
    // c3 should have no children
    TestValidator.equals(
      "c3 has no child comments",
      treeC3.childComments.length,
      0,
    );
  }
  // Validate r1 and its deep child r1a
  const treeR1 = findInTree(topLevel, r1.id);
  TestValidator.predicate("r1 found in tree", () => treeR1 !== undefined);
  if (treeR1) {
    TestValidator.equals("r1 depth is 1", treeR1.depth, 1);
    TestValidator.predicate("r1 has r1a as child", () =>
      treeR1.childComments.some((ch) => ch.id === r1a.id),
    );
  }
  // Validate r2
  const treeR2 = findInTree(topLevel, r2.id);
  TestValidator.predicate("r2 found in tree", () => treeR2 !== undefined);
  if (treeR2) {
    TestValidator.equals("r2 depth is 1", treeR2.depth, 1);
  }
  // Validate r1a (deepest node at depth 2)
  const treeR1a = findInTree(topLevel, r1a.id);
  TestValidator.predicate("r1a found in tree", () => treeR1a !== undefined);
  if (treeR1a) {
    TestValidator.equals("r1a depth is 2", treeR1a.depth, 2);
    TestValidator.equals(
      "r1a has no children",
      treeR1a.childComments.length,
      0,
    );
  }
  // Validate every node has required fields and children are chronologically sorted
  const validateNode = (node: ICommunityHubComment.IList): void => {
    TestValidator.predicate(
      "node has non-empty content",
      () => node.content.length > 0,
    );
    TestValidator.predicate(
      "node has author with valid id",
      () => node.author.id.length > 0,
    );
    TestValidator.predicate(
      "node has created_at timestamp",
      () => node.created_at.length > 0,
    );
    TestValidator.predicate(
      "node has updated_at timestamp",
      () => node.updated_at.length > 0,
    );
    // Child comments must be in chronological order (created_at ASC)
    for (let i = 1; i < node.childComments.length; i++) {
      TestValidator.predicate(
        "child comments sorted chronologically (created_at ASC)",
        () =>
          node.childComments[i - 1].created_at <=
          node.childComments[i].created_at,
      );
    }
    for (const child of node.childComments) {
      validateNode(child);
    }
  };
  for (const node of topLevel) {
    validateNode(node);
  }
}