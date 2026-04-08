import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

export async function test_api_department_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member1 joins and creates organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  // Get organization A from member1's session
  const organizationA = member1Auth.sessions?.[0]?.organization;
  typia.assert(organizationA!);
  // 2. Create departments in organization A
  const department1 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      member1Connection,
      {
        body: { name: RandomGenerator.name() },
        params: { organizationId: organizationA!.id },
      },
    );
  typia.assert(department1);
  const department2 =
    await generate_random_hrm_platform_member_organizations_departments_create(
      member1Connection,
      {
        body: { name: RandomGenerator.name() },
        params: { organizationId: organizationA!.id },
      },
    );
  typia.assert(department2);
  // 3. Member2 joins and creates organization B
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // Get organization B from member2's session
  const organizationB = member2Auth.sessions?.[0]?.organization;
  typia.assert(organizationB!);
  // 4. Member2 attempts to fetch departments from organization A (wrong org)
  const departmentsInOrgA =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      member2Connection,
      {
        organizationId: organizationA!.id,
        body: {},
      },
    );
  typia.assert(departmentsInOrgA);
  // 5. Validate data isolation - member2 should see no departments from org A
  TestValidator.equals(
    "empty departments list for different organization",
    departmentsInOrgA.data,
    [],
  );
  TestValidator.equals(
    "zero total records in pagination for cross-org access",
    departmentsInOrgA.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages in pagination for cross-org access",
    departmentsInOrgA.pagination.pages,
    0,
  );
  // 6. Verify member2 CAN access their own organization's departments (empty since no deps created)
  const departmentsInOrgB =
    await api.functional.hrmPlatform.member.organizations.departments.index(
      member2Connection,
      {
        organizationId: organizationB!.id,
        body: {},
      },
    );
  typia.assert(departmentsInOrgB);
  TestValidator.equals(
    "empty departments list for member2 own organization",
    departmentsInOrgB.data,
    [],
  );
  TestValidator.equals(
    "zero total records for member2 own org",
    departmentsInOrgB.pagination.records,
    0,
  );
}
