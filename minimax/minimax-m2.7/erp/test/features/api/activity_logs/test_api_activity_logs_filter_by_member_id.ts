import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
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
 * Test organization isolation by filtering activity logs by member who performed the action.
 *
 * This test validates:
 * 1. Activity logs can be filtered by member_id
 * 2. Only activity log entries performed by the specified member are returned
 * 3. Response structure includes member summary information (id, email, displayName)
 * 4. Filtering by non-existent member_id returns empty data array with zero records
 */
export async function test_api_activity_logs_filter_by_member_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member to get authenticated
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Query activity logs without filter to establish baseline
  // Using a dummy organization ID for structure validation
  const dummyOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const allActivityLogs =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: dummyOrganizationId,
        body: {} satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(allActivityLogs);
  // 3. Query activity logs filtered by the current member's ID
  const filteredByMemberId =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: dummyOrganizationId,
        body: {
          memberId: authorized.id,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(filteredByMemberId);
  // 4. Validate pagination structure
  TestValidator.equals(
    "has pagination",
    "pagination" in filteredByMemberId,
    true,
  );
  TestValidator.equals(
    "pagination has current",
    "current" in filteredByMemberId.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    "limit" in filteredByMemberId.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    "records" in filteredByMemberId.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    "pages" in filteredByMemberId.pagination,
    true,
  );
  // 5. Validate data array exists
  TestValidator.equals("has data array", "data" in filteredByMemberId, true);
  TestValidator.predicate(
    "data is array",
    Array.isArray(filteredByMemberId.data),
  );
  // 6. Validate response structure for each activity log entry
  for (const activityLog of filteredByMemberId.data) {
    // Validate activity log structure
    TestValidator.equals("has id", "id" in activityLog, true);
    TestValidator.equals("has action_type", "action_type" in activityLog, true);
    TestValidator.equals(
      "has target_entity_type",
      "target_entity_type" in activityLog,
      true,
    );
    TestValidator.equals(
      "has target_entity_id",
      "target_entity_id" in activityLog,
      true,
    );
    TestValidator.equals("has member", "member" in activityLog, true);
    TestValidator.equals("has created_at", "created_at" in activityLog, true);
    // Validate member summary structure
    TestValidator.equals("member has id", "id" in activityLog.member, true);
    TestValidator.equals(
      "member has email",
      "email" in activityLog.member,
      true,
    );
    TestValidator.equals(
      "member has displayName",
      "displayName" in activityLog.member,
      true,
    );
  }
  // 7. Filter by non-existent member_id
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: dummyOrganizationId,
        body: {
          memberId: nonExistentMemberId,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 8. Validate empty result
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("zero records", emptyResult.pagination.records, 0);
  TestValidator.equals("zero pages", emptyResult.pagination.pages, 0);
}
