import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination behavior with large datasets for administrative monitoring.
 * As an administrator, perform paginated searches testing different page and limit
 * combinations using existing rate limit configuration data. Verify that pagination
 * metadata correctly calculates total pages, accurate record counts, and proper
 * cursor-based pagination. Test edge cases including requesting pages beyond
 * available data, custom limit values up to 100.
 */
export async function test_api_admin_api_rate_limits_search_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // First, get the total record count to understand the dataset size
  const initialRequest: ICommunityPlatformApiRateLimit.IRequest = {
    page: 1,
    limit: 1,
  };
  const initialResult =
    await api.functional.communityPlatform.admin.api_rate_limits.index(
      adminConnection,
      { body: initialRequest },
    );
  typia.assert(initialResult);
  const totalRecords = initialResult.pagination.records;
  const totalPages = initialResult.pagination.pages;
  // Only proceed with comprehensive testing if we have sufficient data
  if (totalRecords > 10) {
    // Test pagination with different page and limit combinations
    const testCases = [
      { page: 1, limit: 10 },
      { page: 2, limit: 20 },
      { page: Math.min(3, totalPages), limit: 50 },
      { page: 1, limit: 100 }, // Maximum limit
      { page: Math.min(10, totalPages), limit: 10 },
    ];
    for (const testCase of testCases) {
      const searchRequest: ICommunityPlatformApiRateLimit.IRequest = {
        page: testCase.page,
        limit: testCase.limit,
      };
      const result =
        await api.functional.communityPlatform.admin.api_rate_limits.index(
          adminConnection,
          { body: searchRequest },
        );
      typia.assert(result);
      // Validate pagination metadata
      TestValidator.predicate(
        `page ${testCase.page} limit ${testCase.limit} has valid pagination`,
        () => {
          const { pagination } = result;
          return (
            pagination.current === testCase.page &&
            pagination.limit === testCase.limit &&
            pagination.records === totalRecords &&
            pagination.pages === Math.ceil(totalRecords / testCase.limit)
          );
        },
      );
      // Validate data array size matches limit (except possibly last page)
      if (testCase.page < result.pagination.pages) {
        TestValidator.equals(
          `page ${testCase.page} data size matches limit`,
          result.data.length,
          testCase.limit,
        );
      }
    }
    // Test edge case: page beyond total pages
    const largePageRequest: ICommunityPlatformApiRateLimit.IRequest = {
      page: totalPages + 1,
      limit: 10,
    };
    const edgeResult =
      await api.functional.communityPlatform.admin.api_rate_limits.index(
        adminConnection,
        { body: largePageRequest },
      );
    typia.assert(edgeResult);
    // Page beyond total pages should return empty data array
    TestValidator.equals(
      "page beyond total pages returns empty data",
      edgeResult.data.length,
      0,
    );
    // But pagination metadata should still be valid
    TestValidator.predicate(
      "pagination metadata valid for page beyond total",
      () => {
        const { pagination } = edgeResult;
        return (
          pagination.current === totalPages + 1 &&
          pagination.limit === 10 &&
          pagination.pages === totalPages &&
          pagination.records === totalRecords
        );
      },
    );
  } else {
    // If insufficient data, test basic pagination functionality
    const basicRequest: ICommunityPlatformApiRateLimit.IRequest = {
      page: 1,
      limit: 10,
    };
    const result =
      await api.functional.communityPlatform.admin.api_rate_limits.index(
        adminConnection,
        { body: basicRequest },
      );
    typia.assert(result);
    TestValidator.predicate("basic pagination metadata valid", () => {
      const { pagination } = result;
      return (
        pagination.current === 1 &&
        pagination.limit === 10 &&
        pagination.records >= 0 &&
        pagination.pages >= 0
      );
    });
  }
}
