import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLogType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test searching activity log action types by keyword.
 *
 * Validates the search/filter functionality of the activity log action types endpoint by searching with different keywords and verifying the results match expectations. Action types are system-seeded reference data categorized by business domain (employee, contract, project, task, timesheet, role).
 *
 * Special attention is given to verifying that partial text matching works correctly against both the dot-notation code field (e.g., "project.created") and the display name field, and that search terms producing no matches return an empty result set without errors.
 *
 * 1. Member registers and authenticates via POST /hrmTimeTracking/auth/member/join.
 * 2. Searches for activity log types with keyword "create" and verifies all returned records contain "create" in code or name.
 * 3. Searches with keyword "employee" and verifies all returned records contain "employee" in code or name.
 * 4. Searches with a keyword unlikely to match any action type and verifies an empty result set is returned.
 */
export async function test_api_activity_log_types_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Search for "create" keyword
  const createResults =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          search: "create",
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(createResults);
  TestValidator.predicate(
    "search 'create' returns records containing 'create' in code or name",
    () =>
      createResults.data.length > 0 &&
      createResults.data.every(
        (item) =>
          item.code.toLowerCase().includes("create") ||
          item.name.toLowerCase().includes("create"),
      ),
  );
  // 3. Search for "employee" keyword
  const employeeResults =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          search: "employee",
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(employeeResults);
  TestValidator.predicate(
    "search 'employee' returns records containing 'employee' in code or name",
    () =>
      employeeResults.data.length > 0 &&
      employeeResults.data.every(
        (item) =>
          item.code.toLowerCase().includes("employee") ||
          item.name.toLowerCase().includes("employee"),
      ),
  );
  // 4. Search with no-match keyword
  const noMatchResults =
    await api.functional.hrmTimeTracking.member.activityLogTypes.index(
      memberConnection,
      {
        body: {
          search: "zzzzz_not_a_real_action_type_zzzzz",
        } satisfies IHrmTimeTrackingActivityLogType.IRequest,
      },
    );
  typia.assert(noMatchResults);
  TestValidator.equals(
    "search with no-match keyword returns empty results",
    noMatchResults.data.length,
    0,
  );
}
