import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive search functionality for maintenance schedules with multiple filter combinations.
 * Validates that administrators can search by status type, maintenance operation type, date ranges,
 * text content using trigram indexing, and pagination behavior with different page sizes.
 */
export async function test_api_maintenance_schedule_search_with_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test search with empty filters (get all maintenance schedules)
  const emptySearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns pagination data",
    emptySearch.pagination.records >= 0 && emptySearch.pagination.pages >= 0,
  );
  // 3. Test search with maintenance type filter
  const maintenanceTypeSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.alphabets(10),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(maintenanceTypeSearch);
  // 4. Test search with date range filters
  const dateSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          planned_start_at: new Date().toISOString(),
          planned_end_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(dateSearch);
  // 5. Test search with text content filter
  const textSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(textSearch);
  // 6. Test search with empty text filter
  const emptyTextSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(emptyTextSearch);
  // 7. Test search with combined filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: RandomGenerator.alphabets(8),
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: 2,
          limit: 3,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 8. Test pagination with different page sizes
  const paginationTest =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination limit respected",
    paginationTest.data.length <= 20,
  );
  // 9. Validate that response includes status type information
  if (emptySearch.data.length > 0) {
    const firstSchedule = emptySearch.data[0];
    TestValidator.predicate(
      "schedule has status type",
      firstSchedule.statusType !== undefined,
    );
    TestValidator.predicate(
      "status type has required fields",
      firstSchedule.statusType.id !== undefined &&
        firstSchedule.statusType.category !== undefined &&
        firstSchedule.statusType.code !== undefined &&
        firstSchedule.statusType.display_name !== undefined,
    );
  }
  // 10. Test null filter values
  const nullFilterSearch =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          status_type_id: null,
          maintenance_type: null,
          search: null,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(nullFilterSearch);
}
