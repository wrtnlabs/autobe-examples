import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator searching maintenance schedules with pagination.
 * Validates that super admin can successfully search for maintenance schedules
 * with pagination parameters and receives proper pagination metadata.
 */
export async function test_api_maintenance_schedule_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Search maintenance schedules with default pagination
  const searchResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >() satisfies number as number,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "current page is non-negative",
    searchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation
  TestValidator.equals(
    "pages calculation",
    searchResult.pagination.pages,
    Math.ceil(searchResult.pagination.records / searchResult.pagination.limit),
  );
  // 5. Test empty search with specific parameters
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_maintenance_schedule_search_term_12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // 6. Validate empty search pagination structure
  TestValidator.predicate(
    "empty search has valid current page",
    emptySearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty search has valid limit",
    emptySearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "empty search has valid records count",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty search has valid pages count",
    emptySearchResult.pagination.pages >= 0,
  );
  // 7. Validate empty search pagination calculation
  TestValidator.equals(
    "empty search pages calculation",
    emptySearchResult.pagination.pages,
    Math.ceil(
      emptySearchResult.pagination.records / emptySearchResult.pagination.limit,
    ),
  );
}
