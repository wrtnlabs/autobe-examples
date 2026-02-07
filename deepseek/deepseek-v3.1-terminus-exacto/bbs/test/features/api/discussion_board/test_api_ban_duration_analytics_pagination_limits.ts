import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test ban duration analytics pagination behavior with various limit settings.
 * Verify that the system correctly handles different page sizes and maintains consistent pagination metadata.
 * Test edge cases including the minimum page size (1 record per page), maximum page size (100 records per page),
 * and intermediate values. Validate that pagination metadata accurately reflects the total record count
 * and page calculations. Test navigation between pages by requesting different page numbers and verifying
 * the correct subset of results is returned. Ensure that requesting pages beyond the available range
 * returns appropriate empty results with correct pagination information.
 */
export async function test_api_ban_duration_analytics_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test minimum page size (1 record per page)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit pagination structure",
    typeof minLimitResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "min limit current page positive",
    minLimitResponse.pagination.current >= 0,
  );
  TestValidator.equals(
    "min limit page size 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit records non-negative",
    minLimitResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "min limit pages non-negative",
    minLimitResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "min limit data length valid",
    minLimitResponse.data.length <= 1,
  );
  // Test maximum page size (100 records per page)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: 100 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit page size 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit data length valid",
    maxLimitResponse.data.length <= 100,
  );
  // Test intermediate page sizes
  const intermediateLimits = [10, 25, 50] as const;
  for (const limit of intermediateLimits) {
    const response =
      await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
        superAdminConnection,
        {
          body: {
            limit: limit satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            page: 1 satisfies number as number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
          } satisfies IDiscussionBoardBanDuration.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `intermediate limit ${limit} page size`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `intermediate limit ${limit} data length valid`,
      response.data.length <= limit,
    );
  }
  // Test page navigation with consistent limit
  const consistentLimit = 10;
  const firstPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: consistentLimit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(firstPageResponse);
  const secondPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: consistentLimit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 2 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  // Verify pagination metadata consistency
  TestValidator.equals(
    "consistent total records",
    firstPageResponse.pagination.records,
    secondPageResponse.pagination.records,
  );
  TestValidator.equals(
    "consistent page limit",
    firstPageResponse.pagination.limit,
    secondPageResponse.pagination.limit,
  );
  TestValidator.equals(
    "consistent total pages",
    firstPageResponse.pagination.pages,
    secondPageResponse.pagination.pages,
  );
  // Test page beyond available range
  const highPageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          limit: consistentLimit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1000 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(highPageResponse);
  TestValidator.predicate(
    "high page empty data",
    highPageResponse.data.length === 0,
  );
  TestValidator.equals(
    "high page current page correct",
    highPageResponse.pagination.current,
    1000,
  );
  TestValidator.equals(
    "high page limit consistent",
    highPageResponse.pagination.limit,
    consistentLimit,
  );
  // Validate pagination calculation
  if (firstPageResponse.pagination.records > 0) {
    const calculatedPages = Math.ceil(
      firstPageResponse.pagination.records / firstPageResponse.pagination.limit,
    );
    TestValidator.equals(
      "pagination calculation correct",
      firstPageResponse.pagination.pages,
      calculatedPages,
    );
  }
}
