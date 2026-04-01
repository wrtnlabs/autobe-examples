import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_departments_create } from "../../../generate/generate_random_erp_hrm_time_member_departments_create";
import { generate_random_erp_hrm_time_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_create";
import { prepare_random_erp_hrm_time_department } from "../../../prepare/prepare_random_erp_hrm_time_department";
import { prepare_random_erp_hrm_time_organization } from "../../../prepare/prepare_random_erp_hrm_time_organization";

export async function test_api_department_detail_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const firstOrganizationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const secondOrganizationConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  const firstOrganization =
    await api.functional.erpHrmTime.member.organizations.create(
      firstOrganizationConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  const secondOrganization =
    await api.functional.erpHrmTime.member.organizations.create(
      secondOrganizationConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}-alt`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  const selectedFirstOrganization =
    await api.functional.erpHrmTime.member.organizations.patch(
      firstOrganizationConnection,
      {
        body: {
          name: firstOrganization.name,
          description: firstOrganization.description,
          logoImageUrl: firstOrganization.logoImageUrl,
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(selectedFirstOrganization);
  const createdDepartment =
    await api.functional.erpHrmTime.member.departments.create(
      firstOrganizationConnection,
      {
        body: {
          name: `dept-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeDepartment.ICreate,
      },
    );
  typia.assert(createdDepartment);
  const firstContextDepartment =
    await api.functional.erpHrmTime.member.departments.at(
      firstOrganizationConnection,
      {
        departmentId: createdDepartment.id,
      },
    );
  typia.assert(firstContextDepartment);
  TestValidator.equals(
    "department id should match in the owning organization context",
    firstContextDepartment.id,
    createdDepartment.id,
  );
  TestValidator.equals(
    "department name should match in the owning organization context",
    firstContextDepartment.name,
    createdDepartment.name,
  );
  TestValidator.equals(
    "department description should match in the owning organization context",
    firstContextDepartment.description,
    createdDepartment.description,
  );
  await api.functional.erpHrmTime.member.organizations.patch(
    secondOrganizationConnection,
    {
      body: {
        name: secondOrganization.name,
        description: secondOrganization.description,
        logoImageUrl: secondOrganization.logoImageUrl,
      } satisfies IErpHrmTimeOrganization.IUpdate,
    },
  );
  await TestValidator.error(
    "same department id should not be accessible in a different organization context",
    async () => {
      await api.functional.erpHrmTime.member.departments.at(
        secondOrganizationConnection,
        {
          departmentId: createdDepartment.id,
        },
      );
    },
  );
  TestValidator.notEquals(
    "organization contexts must be different",
    firstOrganization.id,
    secondOrganization.id,
  );
}
