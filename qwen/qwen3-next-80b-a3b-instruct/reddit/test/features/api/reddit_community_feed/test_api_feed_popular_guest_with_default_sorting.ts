import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular_guest_with_default_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: Guest user accessing popular feed with default parameters
  // Create a request with default sort=hot and no other parameters (page and limit defaults)
  const request: IRedditCommunityPost.IRequest = {
    sort: "hot",
  };
  // Call the popular feed endpoint without authorization (guest access)
  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.feed.popular.index(connection, {
      body: request,
    });
  // Validate response structure with typia.assert
  typia.assert(response);
  // Validate pagination fields (using defaults from DTO)
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data array integrity
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  TestValidator.predicate(
    "data array length matches records (if records > 0)",
    response.pagination.records === 0
      ? true
      : response.data.length === response.pagination.limit ||
          response.data.length === response.pagination.records,
  );
}
