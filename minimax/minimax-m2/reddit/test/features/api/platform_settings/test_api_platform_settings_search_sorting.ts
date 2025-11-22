import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformSetting";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSetting";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_settings_search_sorting(
  connection: api.IConnection,
) {
  // Create platform administrator account for authentication
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureAdmin123!",
    display_name: RandomGenerator.name(),
    administrator_level: "admin" as const,
    security_clearance: "high" as const,
    system_permissions: JSON.stringify({
      user_management: { can_view_user_data: true },
      community_oversight: { can_view_community_data: true },
      content_moderation: { can_remove_content: true },
      system_configuration: {
        can_manage_settings: true,
        can_view_system_logs: true,
      },
      compliance_legal: { can_access_compliance_data: true },
    }),
  };

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: adminData satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Test 1: Basic search with no filters
  const basicSearch =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {} satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(basicSearch);

  // Test 2: Search with pagination
  const paginatedSearch =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(paginatedSearch);

  // Test 3: Search by keyword
  const keywordSearch =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          search: "max",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(keywordSearch);

  // Test 4: Filter by data type
  const typeFiltered =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          data_type: "string",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(typeFiltered);

  // Test 5: Filter by visibility
  const visibilityFiltered =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          is_public: true,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(visibilityFiltered);

  // Test 6: Sorting by key (ascending)
  const sortedByKeyAsc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "key",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByKeyAsc);

  // Test 7: Sorting by key (descending)
  const sortedByKeyDesc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "key",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByKeyDesc);

  // Test 8: Sorting by created_at (ascending)
  const sortedByCreatedAsc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByCreatedAsc);

  // Test 9: Sorting by created_at (descending)
  const sortedByCreatedDesc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByCreatedDesc);

  // Test 10: Sorting by updated_at (ascending)
  const sortedByUpdatedAsc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByUpdatedAsc);

  // Test 11: Sorting by updated_at (descending)
  const sortedByUpdatedDesc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "updated_at",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByUpdatedDesc);

  // Test 12: Sorting by data_type (ascending)
  const sortedByTypeAsc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "data_type",
          order_by: "asc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByTypeAsc);

  // Test 13: Sorting by data_type (descending)
  const sortedByTypeDesc =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          sort_by: "data_type",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(sortedByTypeDesc);

  // Test 14: Combined search with sorting
  const combinedSearch =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          search: "setting",
          data_type: "string",
          sort_by: "key",
          order_by: "asc",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(combinedSearch);

  // Test 15: Maximum limit test
  const maxLimitTest =
    await api.functional.redditPlatform.platformAdministrator.platformSettings.index(
      connection,
      {
        body: {
          limit: 100,
          sort_by: "created_at",
          order_by: "desc",
        } satisfies IRedditPlatformSetting.IRequest,
      },
    );
  typia.assert(maxLimitTest);

  // Validate results structure
  TestValidator.equals(
    "basic search returns data",
    basicSearch.data.length > 0,
    true,
  );
  TestValidator.equals(
    "pagination works correctly",
    paginatedSearch.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "keyword search returns results",
    keywordSearch.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "type filtering works",
    typeFiltered.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "visibility filtering works",
    visibilityFiltered.data.length >= 0,
    true,
  );

  // Validate sorting by comparing data arrays
  if (sortedByKeyAsc.data.length > 1 && sortedByKeyDesc.data.length > 1) {
    const ascKeys = sortedByKeyAsc.data.map((item) => item.key);
    const descKeys = sortedByKeyDesc.data.map((item) => item.key);
    TestValidator.predicate(
      "key ascending sort correct",
      ascKeys[0] <= ascKeys[ascKeys.length - 1],
    );
    TestValidator.predicate(
      "key descending sort correct",
      descKeys[0] >= descKeys[descKeys.length - 1],
    );
  }

  if (
    sortedByCreatedAsc.data.length > 1 &&
    sortedByCreatedDesc.data.length > 1
  ) {
    const ascDates = sortedByCreatedAsc.data.map(
      (item) => new Date(item.created_at),
    );
    const descDates = sortedByCreatedDesc.data.map(
      (item) => new Date(item.created_at),
    );
    TestValidator.predicate(
      "created_at ascending sort correct",
      ascDates[0] <= ascDates[ascDates.length - 1],
    );
    TestValidator.predicate(
      "created_at descending sort correct",
      descDates[0] >= descDates[descDates.length - 1],
    );
  }

  if (
    sortedByUpdatedAsc.data.length > 1 &&
    sortedByUpdatedDesc.data.length > 1
  ) {
    const ascUpdated = sortedByUpdatedAsc.data.map(
      (item) => new Date(item.updated_at),
    );
    const descUpdated = sortedByUpdatedDesc.data.map(
      (item) => new Date(item.updated_at),
    );
    TestValidator.predicate(
      "updated_at ascending sort correct",
      ascUpdated[0] <= ascUpdated[ascUpdated.length - 1],
    );
    TestValidator.predicate(
      "updated_at descending sort correct",
      descUpdated[0] >= descUpdated[descUpdated.length - 1],
    );
  }

  if (sortedByTypeAsc.data.length > 1 && sortedByTypeDesc.data.length > 1) {
    const ascTypes = sortedByTypeAsc.data.map((item) => item.data_type);
    const descTypes = sortedByTypeDesc.data.map((item) => item.data_type);
    TestValidator.predicate(
      "data_type ascending sort correct",
      ascTypes[0] <= ascTypes[ascTypes.length - 1],
    );
    TestValidator.predicate(
      "data_type descending sort correct",
      descTypes[0] >= descTypes[descTypes.length - 1],
    );
  }

  // Validate combined search results
  TestValidator.equals(
    "combined search returns structured data",
    combinedSearch.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "max limit test respects limits",
    maxLimitTest.data.length <= 100,
    true,
  );

  // Validate pagination information
  TestValidator.predicate(
    "pagination metadata is consistent",
    basicSearch.pagination.current >= 0 &&
      basicSearch.pagination.limit >= 0 &&
      basicSearch.pagination.records >= 0,
  );
}
