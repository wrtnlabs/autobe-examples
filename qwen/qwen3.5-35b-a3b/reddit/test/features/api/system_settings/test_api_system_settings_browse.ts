import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_settings_browse(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Send PATCH request with empty body (default pagination: page=1, pageSize=100, deletedAt=null)
  // This endpoint requires admin authorization, so we test with a valid admin connection
  const response = await api.functional.redditCommunity.system_settings.index(
    adminConnection,
    {
      body: {} satisfies IRedditCommunitySystemSetting.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 100", response.pagination.limit, 100);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages equals ceiling of records divided by limit",
    response.pagination.records === 0
      ? response.pagination.pages === 0
      : Math.ceil(response.pagination.records / response.pagination.limit) ===
          response.pagination.pages,
  );
  // Validate data array contains system setting summaries
  typia.assert(response.data);
  TestValidator.equals("data array exists", response.data !== undefined, true);
  // Validate at least one system setting record exists
  TestValidator.predicate(
    "at least one system setting exists",
    response.data.length > 0,
  );
  // Validate each system setting summary has required fields
  // (typia.assert(response) already validated structure, just check business logic)
  for (let i = 0; i < response.data.length; i++) {
    const setting = response.data[i];
    // Confirm soft-deleted records are excluded by default (deleted_at should be null)
    TestValidator.equals(
      `setting ${i} deleted_at is null`,
      setting.deleted_at,
      null,
    );
  }
  // Validate sorting: records should be sorted by created_at descending (newest first)
  if (response.data.length > 1) {
    let isSortedDescending = true;
    for (let i = 1; i < response.data.length; i++) {
      const prevCreated = new Date(response.data[i - 1].created_at).getTime();
      const currCreated = new Date(response.data[i].created_at).getTime();
      if (prevCreated < currCreated) {
        isSortedDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "records sorted by created_at descending",
      isSortedDescending,
    );
  }
}
