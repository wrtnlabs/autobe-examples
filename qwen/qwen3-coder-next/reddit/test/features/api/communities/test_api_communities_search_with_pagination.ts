import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: Based on the API definition, the PATCH /redditPlatform/communities endpoint
  // only accepts IRedditPlatformCommunity.IRequest which is an empty object.
  // The actual search and pagination functionality is not directly exposed in the
  // provided API structure, so this test focuses on what's available.
  // Test basic functionality with empty request body
  const result = await api.functional.redditPlatform.communities.index(
    adminConnection,
    {
      body: {} satisfies IRedditPlatformCommunity.IRequest,
    },
  );
  typia.assert(result);
  // Validate the response structure
  TestValidator.predicate("result has pagination", () => {
    return (
      result.pagination !== undefined && typeof result.pagination === "object"
    );
  });
  TestValidator.predicate("result has data array", () => {
    return result.data !== undefined && Array.isArray(result.data);
  });
  // Verify pagination fields exist
  if (result.pagination) {
    TestValidator.predicate("pagination has current", () => {
      return typeof result.pagination.current === "number";
    });
    TestValidator.predicate("pagination has limit", () => {
      return typeof result.pagination.limit === "number";
    });
    TestValidator.predicate("pagination has records", () => {
      return typeof result.pagination.records === "number";
    });
    TestValidator.predicate("pagination has pages", () => {
      return typeof result.pagination.pages === "number";
    });
  }
  // Verify data array structure
  if (result.data && result.data.length > 0) {
    // Check first item if data exists
    TestValidator.predicate("first data item is valid", () => {
      return result.data[0] !== undefined;
    });
  }
}
