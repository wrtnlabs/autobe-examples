import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_list_by_email_domain_and_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for moderator listing
  const adminConnection: api.IConnection = { host: connection.host };
  // Execute the paginated list endpoint without filters (since IRequest is {})
  const result = await api.functional.community.moderators.index(
    adminConnection,
    {
      body: {},
    },
  );
  // Validate the response structure
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals(
    "page current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should be default",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count should be >= 0",
    result.pagination.pages >= 0,
  );
  // Verify data is an array of empty objects (as per ICommunityModerator.ISummary = {})
  TestValidator.equals(
    "data should be array",
    Array.isArray(result.data),
    true,
  );
  // Validate each item in data is an empty object (ICommunityModerator.ISummary = {})
  result.data.forEach((item, index) => {
    TestValidator.predicate(
      `item ${index} should be object`,
      typeof item === "object",
    );
    TestValidator.predicate(
      `item ${index} should be empty object`,
      Object.keys(item).length === 0,
    );
  });
}
