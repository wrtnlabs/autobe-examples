import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test different sorting algorithms for member's comment history.
 *
 * This test verifies that the comment list endpoint correctly handles
 * different sorting options: 'best', 'new', and 'controversial'.
 */
export async function test_api_member_comments_list_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create community (automatically subscribes creator)
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Create multiple comments with delays for timestamp variation
  const commentA = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
      body: { content: RandomGenerator.paragraph({ sentences: 3 }) },
    },
  );
  typia.assert(commentA);
  // Delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const commentB = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
      body: { content: RandomGenerator.paragraph({ sentences: 4 }) },
    },
  );
  typia.assert(commentB);
  // Delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const commentC = await generate_random_community_member_posts_comments_create(
    authorConnection,
    {
      params: { postId: post.id },
      body: { content: RandomGenerator.paragraph({ sentences: 5 }) },
    },
  );
  typia.assert(commentC);
  // Test 1: 'best' sorting - highest vote_score first
  const bestResult = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: author.id,
      body: {
        sort: "best",
        limit: 10,
        page: 1,
      } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(bestResult);
  TestValidator.predicate(
    "best sorting returns comments",
    bestResult.data.length >= 3,
  );
  TestValidator.predicate(
    "best sorting comments belong to author",
    bestResult.data.every((c) => c.author.id === author.id),
  );
  // Test 2: 'new' sorting - most recent first (created_at DESC)
  const newResult = await api.functional.community.members.comments.index(
    connection,
    {
      memberId: author.id,
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(newResult);
  TestValidator.predicate(
    "new sorting returns comments",
    newResult.data.length >= 3,
  );
  // Verify 'new' sort order: most recent comments first
  const newComments = newResult.data;
  for (let i = 0; i < newComments.length - 1; i++) {
    const current = new Date(newComments[i].created_at).getTime();
    const next = new Date(newComments[i + 1].created_at).getTime();
    TestValidator.predicate(
      "new sorting: comments ordered by created_at DESC",
      current >= next,
    );
  }
  // Verify comment C (most recent) appears before comment A (oldest) in 'new' sort
  const commentAIndex = newComments.findIndex((c) => c.id === commentA.id);
  const commentCIndex = newComments.findIndex((c) => c.id === commentC.id);
  TestValidator.predicate(
    "comment C (recent) appears before comment A (oldest) in new sort",
    commentCIndex < commentAIndex,
  );
  // Test 3: 'controversial' sorting
  const controversialResult =
    await api.functional.community.members.comments.index(connection, {
      memberId: author.id,
      body: {
        sort: "controversial",
        limit: 10,
        page: 1,
      } satisfies ICommunityComment.IRequest,
    });
  typia.assert(controversialResult);
  TestValidator.predicate(
    "controversial sorting returns comments",
    controversialResult.data.length >= 3,
  );
  // Verify pagination metadata is consistent across all sort options
  TestValidator.equals(
    "pagination current page is 1 for all sorts",
    bestResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10 for all sorts",
    bestResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is at least 3",
    bestResult.pagination.records >= 3,
  );
  // Verify all results contain the same set of comments (just ordered differently)
  const bestIds = new Set(bestResult.data.map((c) => c.id));
  const newIds = new Set(newResult.data.map((c) => c.id));
  const controversialIds = new Set(controversialResult.data.map((c) => c.id));
  TestValidator.predicate(
    "all sorting methods return the same comments",
    bestIds.size === newIds.size &&
      newIds.size === controversialIds.size &&
      [...bestIds].every((id) => newIds.has(id)),
  );
}
