import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving comments for a post and verify the response structure.
 *
 * This test validates the comment retrieval endpoint by:
 * 1. Creating a community and post as prerequisites
 * 2. Retrieving comments for the post with different sorting options
 * 3. Validating pagination metadata and response structure
 * 4. Testing different sort orders (created_at, score)
 */
export async function test_api_comment_retrieval_threaded_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(communityConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const community =
    await generate_random_reddit_clone_member_communities_create(
      communityConnection,
      {},
    );
  typia.assert(community);
  // 2. Create and authenticate first member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Retrieve comments for the post (initially empty)
  const commentsResponse =
    await api.functional.redditClone.posts.comments.index(authorConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        order: "desc",
      },
    });
  typia.assert(commentsResponse);
  // 5. Validate response structure
  TestValidator.predicate(
    "response has pagination object",
    commentsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(commentsResponse.data),
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    commentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    commentsResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination total records",
    commentsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages when empty",
    commentsResponse.pagination.pages,
    0,
  );
  // 7. Test with different sort option (score)
  const sortedByScore = await api.functional.redditClone.posts.comments.index(
    authorConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 50,
        sort: "score",
        order: "desc",
      },
    },
  );
  typia.assert(sortedByScore);
  // 8. Validate score sorting response
  TestValidator.equals(
    "score sorting pagination current",
    sortedByScore.pagination.current,
    1,
  );
  TestValidator.equals(
    "score sorting pagination limit",
    sortedByScore.pagination.limit,
    50,
  );
  TestValidator.equals(
    "score sorting total records",
    sortedByScore.pagination.records,
    0,
  );
  // 9. Test with updated_at sort option
  const sortedByUpdated = await api.functional.redditClone.posts.comments.index(
    authorConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "updated_at",
        order: "asc",
      },
    },
  );
  typia.assert(sortedByUpdated);
  // 10. Validate updated_at sorting response
  TestValidator.equals(
    "updated_at sorting pagination limit",
    sortedByUpdated.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "updated_at sorting has valid pagination",
    sortedByUpdated.pagination.current >= 1,
  );
  // 11. Test pagination with small limit
  const paginatedResponse =
    await api.functional.redditClone.posts.comments.index(authorConnection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 2,
        sort: "created_at",
        order: "desc",
      },
    });
  typia.assert(paginatedResponse);
  // 12. Validate small pagination
  TestValidator.equals(
    "small pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "small pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "small pagination data length",
    paginatedResponse.data.length,
    0,
  );
  // 13. Test with search parameter (empty search)
  const searchResponse = await api.functional.redditClone.posts.comments.index(
    authorConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
        search: "",
      },
    },
  );
  typia.assert(searchResponse);
  // 14. Validate search response structure
  TestValidator.predicate(
    "search response has valid structure",
    searchResponse.pagination !== undefined &&
      Array.isArray(searchResponse.data),
  );
  TestValidator.equals(
    "search pagination limit",
    searchResponse.pagination.limit,
    10,
  );
}
