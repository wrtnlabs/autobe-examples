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
 * Test search behavior when no maintenance schedules match the specified criteria.
 * Validate that the system returns an empty paginated result set with proper pagination
 * metadata (current page, limit, records=0, pages=0). Test edge cases such as searching
 * for non-existent status types, maintenance types that don't exist, date ranges with
 * no scheduled maintenance, and text searches that yield no matches.
 */
export async function test_api_maintenance_schedule_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with non-existent status type ID
  const nonExistentStatusId = typia.random<string & tags.Format<"uuid">>();
  const search1 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          status_type_id: nonExistentStatusId,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search1);
  TestValidator.equals(
    "empty results for non-existent status type",
    search1.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    search1.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", search1.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    search1.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", search1.pagination.limit, 10);
  // Test 2: Search with non-existent maintenance type
  const nonExistentMaintenanceType = RandomGenerator.alphabets(10);
  const search2 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          maintenance_type: nonExistentMaintenanceType,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search2);
  TestValidator.equals(
    "empty results for non-existent maintenance type",
    search2.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    search2.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", search2.pagination.pages, 0);
  // Test 3: Search with date range that has no maintenance schedules
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const search3 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          planned_start_at: futureDate,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search3);
  TestValidator.equals(
    "empty results for future date range",
    search3.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    search3.pagination.records,
    0,
  );
  // Test 4: Search with text that doesn't match any records
  const nonMatchingText = RandomGenerator.content({ paragraphs: 1 });
  const search4 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          search: nonMatchingText,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search4);
  TestValidator.equals(
    "empty results for non-matching text search",
    search4.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    search4.pagination.records,
    0,
  );
  // Test 5: Combined criteria that guarantees no results
  const search5 =
    await api.functional.discussionBoard.admin.maintenance_schedules.index(
      adminConnection,
      {
        body: {
          status_type_id: nonExistentStatusId,
          maintenance_type: nonExistentMaintenanceType,
          planned_start_at: futureDate,
          search: nonMatchingText,
          page: 2,
          limit: 25,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(search5);
  TestValidator.equals(
    "empty results for combined criteria",
    search5.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    search5.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", search5.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 2",
    search5.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 25", search5.pagination.limit, 25);
}
