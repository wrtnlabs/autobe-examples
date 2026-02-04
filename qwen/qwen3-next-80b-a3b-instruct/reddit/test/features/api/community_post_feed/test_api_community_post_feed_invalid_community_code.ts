import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
export async function test_api_community_post_feed_invalid_community_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent community code
  const invalidCommunityCode =
    "invalid-community-" + RandomGenerator.alphaNumeric(8);
  // Call the API endpoint to get top posts from the non-existent community
  const response: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.top.index(
      connection,
      {
        communityCode: invalidCommunityCode,
      },
    );
  // Validate the response type using typia.assert() to ensure strict type safety
  typia.assert(response);
  // Validate the pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should be 0 for non-existent community",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for zero records",
    response.pagination.pages,
    0,
  );
  // Validate that the data array is empty
  TestValidator.equals(
    "data array should be empty for non-existent community",
    response.data.length,
    0,
  );
}
