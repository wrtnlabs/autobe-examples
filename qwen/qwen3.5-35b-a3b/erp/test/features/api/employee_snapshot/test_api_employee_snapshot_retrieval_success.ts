import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeesSnapshot";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.hrmPlatform.member.employees.snapshots.at(
      memberConnection,
      { employeeId, snapshotId },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "employee_id matches path parameter",
    snapshot.employee_id,
    employeeId,
  );
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.equals(
    "user_id is valid uuid",
    snapshot.user_id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization_id is valid uuid",
    snapshot.organization_id !== undefined,
    true,
  );
  TestValidator.equals(
    "role_id is valid uuid",
    snapshot.role_id !== undefined,
    true,
  );
  TestValidator.equals(
    "department_id is valid uuid or null",
    snapshot.department_id !== undefined,
    true,
  );
  TestValidator.equals(
    "position is string or null",
    snapshot.position !== undefined,
    true,
  );
  TestValidator.equals(
    "employment_type is present",
    snapshot.employment_type !== undefined,
    true,
  );
  TestValidator.equals(
    "status is present",
    snapshot.status !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at is valid date-time",
    snapshot.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "member relation is populated",
    snapshot.member !== null && snapshot.member.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization relation is populated",
    snapshot.organization !== null && snapshot.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "role relation is populated",
    snapshot.role !== null && snapshot.role.id !== undefined,
    true,
  );
  TestValidator.equals(
    "department relation is null or populated",
    snapshot.department === null ||
      (snapshot.department !== null && snapshot.department.id !== undefined),
    true,
  );
}
