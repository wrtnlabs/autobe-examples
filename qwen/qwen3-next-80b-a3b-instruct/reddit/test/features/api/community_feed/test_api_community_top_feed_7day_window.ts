import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_top_feed_7day_window(
  connection: api.IConnection,
): Promise<void> {
  // Create base connection
  const baseConnection: api.IConnection = { host: connection.host };
  // Create request body with top_period set to "1_week" (as 7 days corresponds to 1 week)
  // The API description mentions '1 day', '1 week', etc., so "1_week" is the most logical format
  const requestBody: ICommunityPost.IRequest = {
    sort_algorithm: "top",
    top_period: "1_week",
    // Page token is optional and can be omitted for first page
    page_token: null,
  };
  // Call the endpoint to retrieve the top feed
  const response: IPageICommunityPost.ISummary =
    await api.functional.community.community_feeds.index(baseConnection, {
      body: requestBody,
    });
  typia.assert(response);
  // Validate response structure as per IPageICommunityPost.ISummary
  TestValidator.equals(
    "response has pagination property",
    response.pagination != null,
    true,
  );
  TestValidator.equals(
    "response has data property",
    response.data != null,
    true,
  );
  // Validate pagination structure according to IPage.IPagination
  TestValidator.predicate(
    "pagination current is positive integer",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is positive integer",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive integer",
    response.pagination.pages >= 0,
  );
  // Validate data is an array
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Validate each item in data follows ICommunityPost.ISummary structure
  // Since ICommunityPost.ISummary is defined as empty {} in the schema, we can't validate specific properties
  // But we can at least verify they're objects
  for (const item of response.data) {
    TestValidator.predicate(
      "each item in data is an object",
      typeof item === "object" && item !== null,
    );
  }
}
