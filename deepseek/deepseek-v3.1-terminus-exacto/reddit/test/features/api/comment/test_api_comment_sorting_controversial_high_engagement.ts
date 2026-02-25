import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_sorting_controversial_high_engagement(
  connection: api.IConnection,
): Promise<void> {
  // Create primary user (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(author);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Test controversial sorting endpoint with available parameters
  const controversialResponse =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      authorConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: null,
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Validate response structure for controversial sorting
  TestValidator.predicate(
    "should return paginated response",
    controversialResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "should have data array",
    Array.isArray(controversialResponse.data),
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination should have current page",
    typeof controversialResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination should have limit",
    typeof controversialResponse.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination should have records",
    typeof controversialResponse.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination should have pages",
    typeof controversialResponse.pagination.pages,
    "number",
  );
  // Validate comment summary structure if comments exist
  if (controversialResponse.data.length > 0) {
    const comment = controversialResponse.data[0];
    TestValidator.equals("comment should have id", typeof comment.id, "string");
    TestValidator.equals(
      "comment should have content",
      typeof comment.content,
      "string",
    );
    TestValidator.predicate(
      "content should be truncated",
      comment.content.length <= 200,
    );
    TestValidator.equals(
      "comment should have author",
      typeof comment.author,
      "object",
    );
    TestValidator.equals(
      "comment should have post",
      typeof comment.post,
      "object",
    );
    TestValidator.equals(
      "comment should have vote_score",
      typeof comment.vote_score,
      "number",
    );
    TestValidator.equals(
      "comment should have created_at",
      typeof comment.created_at,
      "string",
    );
    // Validate author structure
    TestValidator.equals(
      "author should have id",
      typeof comment.author.id,
      "string",
    );
    TestValidator.equals(
      "author should have username",
      typeof comment.author.username,
      "string",
    );
    TestValidator.predicate(
      "author should have valid display_name",
      typeof comment.author.display_name === "string" || comment.author.display_name === null,
    );
    TestValidator.predicate(
      "author should have valid avatar_url",
      typeof comment.author.avatar_url === "string" || comment.author.avatar_url === null,
    );
    TestValidator.equals(
      "author should have karma",
      typeof comment.author.karma,
      "number",
    );
    TestValidator.equals(
      "author should have created_at",
      typeof comment.author.created_at,
      "string",
    );
    // Validate post structure
    TestValidator.equals(
      "post should have id",
      typeof comment.post.id,
      "string",
    );
    TestValidator.equals(
      "post should have title",
      typeof comment.post.title,
      "string",
    );
    TestValidator.equals(
      "post should have post_type",
      typeof comment.post.post_type,
      "string",
    );
    TestValidator.equals(
      "post should have author",
      typeof comment.post.author,
      "object",
    );
    TestValidator.equals(
      "post should have community",
      typeof comment.post.community,
      "object",
    );
    TestValidator.equals(
      "post should have created_at",
      typeof comment.post.created_at,
      "string",
    );
  }
  // Test different sorting algorithms for comparison
  const newResponse =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      authorConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: null,
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(newResponse);
  const bestResponse =
    await api.functional.communityPlatform.user.posts.comments.sorted.index(
      authorConnection,
      {
        postId: post.id,
        body: {
          parent_comment_id: null,
          sort: "best",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestResponse);
  // Validate that all sorting methods return valid pagination structures
  TestValidator.predicate(
    "new sorting should return valid response",
    newResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "best sorting should return valid response",
    bestResponse.pagination !== undefined,
  );
}