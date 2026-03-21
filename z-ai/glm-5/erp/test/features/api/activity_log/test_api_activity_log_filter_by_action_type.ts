import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering activity logs by action type.
 *
 * Validates that the activity logs endpoint correctly filters by action_type
 * parameter, returning only entries matching the specified action type.
 */
export async function test_api_activity_log_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account which generates activity logs
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Step 2: Get all activity logs first to see available action types
  const allLogs = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(allLogs);
  // Verify there are some activity logs from the join process
  TestValidator.predicate(
    "activity logs exist after join",
    allLogs.data.length > 0,
  );
  // Step 3: Extract unique action types from results
  const actionTypes = [...new Set(allLogs.data.map((log) => log.actionType))];
  TestValidator.predicate(
    "at least one action type available",
    actionTypes.length >= 1,
  );
  // Step 4: Test filtering by first action type
  const firstActionType = actionTypes[0];
  const filteredLogs = await api.functional.erpHrm.member.activity_logs.index(
    memberConnection,
    {
      body: {
        action_type: firstActionType,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(filteredLogs);
  // Step 5: Validate all filtered entries match the action type
  TestValidator.predicate(
    "all filtered logs have correct action type",
    filteredLogs.data.every((log) => log.actionType === firstActionType),
  );
  // Step 6: Verify pagination metadata is accurate
  TestValidator.predicate(
    "pagination current page is valid",
    filteredLogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    filteredLogs.pagination.limit >= 1,
  );
  // Step 7: Test with a different action type if available
  if (actionTypes.length >= 2) {
    const secondActionType = actionTypes[1];
    const secondFilteredLogs =
      await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
        body: {
          action_type: secondActionType,
        } satisfies IErpHrmActivityLog.IRequest,
      });
    typia.assert(secondFilteredLogs);
    // Verify second filter returns correct entries
    TestValidator.predicate(
      "second action type filter returns correct entries",
      secondFilteredLogs.data.every(
        (log) => log.actionType === secondActionType,
      ),
    );
    // Verify first and second action type filters return different results
    const firstIds = new Set(filteredLogs.data.map((log) => log.id));
    const secondIds = new Set(secondFilteredLogs.data.map((log) => log.id));
    // Results should not overlap since they have different action types
    const overlappingIds = [...firstIds].filter((id) => secondIds.has(id));
    TestValidator.equals(
      "different action types produce non-overlapping results",
      overlappingIds.length,
      0,
    );
  }
  // Step 8: Test filtering by non-existent action type
  const nonExistentLogs =
    await api.functional.erpHrm.member.activity_logs.index(memberConnection, {
      body: {
        action_type: "non_existent_action_type_12345",
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(nonExistentLogs);
  TestValidator.equals(
    "non-existent action type returns empty results",
    nonExistentLogs.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent action type has zero records",
    nonExistentLogs.pagination.records,
    0,
  );
}
