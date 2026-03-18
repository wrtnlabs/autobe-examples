import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_retrieval_with_org_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (first member typically gets owner role with org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Invite an employee to generate an activity log entry (employee.invited action)
  // Note: role_id must be valid - in production this would be fetched from roles endpoint
  // For E2E testing, we use a random UUID which the backend should handle
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const employee = await api.functional.hrmPlatform.member.employees.invite(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: roleId,
      } satisfies IHrmPlatformEmployee.IInvite,
    },
  );
  typia.assert(employee);
  // 3. Retrieve activity logs with pagination
  const activityLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(activityLogs);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    activityLogs.pagination !== undefined,
  );
  TestValidator.equals("current page", activityLogs.pagination.current, 1);
  TestValidator.equals("limit", activityLogs.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    activityLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    activityLogs.pagination.pages >= 0,
  );
  // 5. Validate activity log data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(activityLogs.data),
  );
  // 6. If there are activity logs, validate structure of entries
  if (activityLogs.data.length > 0) {
    const firstLog = activityLogs.data[0]!;
    // Validate member structure (typia.assert already validated main structure)
    TestValidator.predicate("member has id", firstLog.member.id !== undefined);
    TestValidator.predicate(
      "member has email",
      firstLog.member.email !== undefined,
    );
    TestValidator.predicate(
      "member has display_name",
      firstLog.member.display_name !== undefined,
    );
  }
  // 7. Verify at least one activity log was created from employee invitation
  TestValidator.predicate(
    "at least one activity log exists",
    activityLogs.data.length >= 1,
  );
  // 8. Verify sorting (created_at DESC - most recent first)
  if (activityLogs.data.length > 1) {
    for (let i = 1; i < activityLogs.data.length; i++) {
      const prev = activityLogs.data[i - 1]!;
      const curr = activityLogs.data[i]!;
      TestValidator.predicate(
        `logs sorted by created_at DESC (index ${i - 1} vs ${i})`,
        new Date(prev.created_at).getTime() >=
          new Date(curr.created_at).getTime(),
      );
    }
  }
}
