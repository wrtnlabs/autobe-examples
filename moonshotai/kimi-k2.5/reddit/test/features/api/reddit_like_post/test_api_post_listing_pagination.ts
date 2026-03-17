import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_listing_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test basic pagination with default sorting (newest first)
  const defaultRequestBody = {
    sort: "new",
    page: 1,
    limit: 20,
  } satisfies IRedditLikePost.IRequest;
  const defaultResponse = await api.functional.redditLike.posts.index(
    connection,
    {
      body: defaultRequestBody,
    },
  );
  // Validate complete response structure including pagination and post data
  typia.assert(defaultResponse);
  // Validate data array size constraint relative to limit (business logic)
  TestValidator.predicate(
    "data array within limit",
    () => defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  // Test custom pagination parameters
  const customRequestBody = {
    page: 1,
    limit: 10,
    sort: "new",
  } satisfies IRedditLikePost.IRequest;
  const customResponse = await api.functional.redditLike.posts.index(
    connection,
    {
      body: customRequestBody,
    },
  );
  typia.assert(customResponse);
}
