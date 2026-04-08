import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timetracking_recent_timelogs_few_entries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with email, password, and organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create employee-specific connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  // 3. Call recent timelogs endpoint - returns a single timelog entry (not an array)
  const timelog: IHrmPlatformTimelog =
    await api.functional.hrmPlatform.member.timetracking.recent_timelogs.recent(
      memberConnection,
    );
  typia.assert(timelog);
  // 4. Verify all required timelog fields are present
  TestValidator.equals("timelog id exists", timelog.id !== undefined, true);
  TestValidator.equals(
    "timelog start_datetime exists",
    timelog.start_datetime !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog end_datetime exists",
    timelog.end_datetime !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog duration_minutes exists",
    timelog.duration_minutes !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog billable exists",
    timelog.billable !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog created_at exists",
    timelog.created_at !== undefined,
    true,
  );
  // 5. Verify employee reference exists and is summary type
  TestValidator.equals(
    "timelog employee reference exists",
    timelog.employee !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog employee id exists",
    timelog.employee.id !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog employee code exists",
    timelog.employee.employee_code !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog employee email exists",
    timelog.employee.email !== undefined,
    true,
  );
  // 6. Verify project reference exists and is summary type
  TestValidator.equals(
    "timelog project reference exists",
    timelog.project !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project id exists",
    timelog.project.id !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project name exists",
    timelog.project.name !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project status exists",
    timelog.project.status !== undefined,
    true,
  );
  // 7. Verify soft-deleted timelog is not included (deleted_at is null)
  TestValidator.equals("timelog soft delete check", timelog.deleted_at, null);
  // 8. Validate employee reference matches authenticated user
  TestValidator.equals(
    "timelog employee matches user",
    timelog.employee.id,
    joinResult.member.id,
  );
  // 9. Verify project has required summary fields
  TestValidator.equals(
    "timelog project has color_code",
    timelog.project.color_code !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project has total_hours",
    timelog.project.total_hours !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project has billable_hours",
    timelog.project.billable_hours !== undefined,
    true,
  );
  TestValidator.equals(
    "timelog project has created_at",
    timelog.project.created_at !== undefined,
    true,
  );
  // 10. Verify duration_minutes is a valid number
  TestValidator.predicate(
    "duration_minutes is positive number",
    timelog.duration_minutes > 0,
  );
  // 11. Verify end_datetime is after start_datetime
  TestValidator.predicate(
    "end_datetime is after start_datetime",
    timelog.end_datetime > timelog.start_datetime,
  );
}
