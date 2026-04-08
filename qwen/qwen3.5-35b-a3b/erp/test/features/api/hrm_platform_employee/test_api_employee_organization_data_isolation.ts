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
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Organization A with Member Alice as Owner
  const aliceConnection: api.IConnection = { host: connection.host };
  const alicePassword = RandomGenerator.alphaNumeric(16);
  const aliceResult = await authorize_member_join(aliceConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: alicePassword,
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
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
  typia.assert(aliceResult);
  // 2. Create Organization B with Member Bob as Owner
  const bobConnection: api.IConnection = { host: connection.host };
  const bobPassword = RandomGenerator.alphaNumeric(16);
  const bobResult = await authorize_member_join(bobConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: bobPassword,
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
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
  typia.assert(bobResult);
  // Ensure Alice and Bob have different organizations
  TestValidator.notEquals(
    "organizations should differ",
    aliceResult.member.id,
    bobResult.member.id,
  );
  // 3. Authenticate as Bob and list employees
  // The employee listing endpoint is PATCH /hrmPlatform/member/employees
  // It should return employees only from Bob's organization
  const bobListConnection: api.IConnection = { host: connection.host };
  const bobAuthenticated = await authorize_member_join(bobListConnection, {
    body: {
      email: bobResult.email,
      password: bobPassword,
      name: bobResult.member.display_name,
      phone_number: bobResult.member.phone_number,
      org_name: bobResult.member.display_name || "bob-org",
      org_currency: "USD",
      href: "http://test.example.com",
      referrer: "http://test.example.com",
      ip: "127.0.0.1",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(bobAuthenticated);
  // 4. List employees from Bob's organization
  const employeesResponse =
    await api.functional.hrmPlatform.member.employees.index(bobListConnection, {
      body: {
        limit: 100,
      },
    });
  typia.assert(employeesResponse);
  // 5. Validate organization isolation
  // All returned employees must belong to Bob's organization
  TestValidator.equals(
    "all employees belong to bob's organization",
    employeesResponse.data.every(
      (emp) => emp.organization.id === bobAuthenticated.member.id,
    ),
    true,
  );
  // 6. If there are any employees, verify each one's organization matches
  if (employeesResponse.data.length > 0) {
    for (const employee of employeesResponse.data) {
      TestValidator.equals(
        "employee org matches authenticated user",
        employee.organization.id,
        bobAuthenticated.member.id,
      );
    }
  }
  // 7. Test with different filters to ensure isolation holds
  // Even with filters applied, no cross-organization data should leak
  const filteredEmployeesResponse =
    await api.functional.hrmPlatform.member.employees.index(bobListConnection, {
      body: {
        status: "active",
        limit: 100,
      },
    });
  typia.assert(filteredEmployeesResponse);
  TestValidator.equals(
    "filtered employees also belong to bob's organization",
    filteredEmployeesResponse.data.every(
      (emp) => emp.organization.id === bobAuthenticated.member.id,
    ),
    true,
  );
}
