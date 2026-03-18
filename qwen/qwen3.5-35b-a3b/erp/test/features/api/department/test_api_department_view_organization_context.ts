import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";

export async function test_api_department_view_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const authConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Extract organization ID from first organization membership
  const firstOrgMembership: IHrmsOrganizationMember.ISummary =
    authorized.organization_memberships[0];
  const organizationId: string = firstOrgMembership.organization.id;
  // 3. Create a department within this organization
  const departmentName: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const createdDepartment: IHrmsDepartment =
    await generate_random_hrms_member_organizations_departments_create(
      authConnection,
      {
        body: {
          name: departmentName,
          description: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
        },
        params: { organizationId },
      },
    );
  typia.assert(createdDepartment);
  // 4. Validate department belongs to the correct organization
  TestValidator.equals(
    "department organization_id",
    createdDepartment.organization.id,
    organizationId,
  );
  // 5. Retrieve the department to validate it's accessible in organization context
  const retrievedDepartment: IHrmsDepartment =
    await api.functional.hrms.member.departments.at(authConnection, {
      departmentId: createdDepartment.id,
    });
  typia.assert(retrievedDepartment);
  // 6. Validate retrieved department matches created department
  TestValidator.equals(
    "retrieved department ID",
    retrievedDepartment.id,
    createdDepartment.id,
  );
  TestValidator.equals(
    "department name",
    retrievedDepartment.name,
    departmentName,
  );
  TestValidator.equals(
    "department organization_id after retrieval",
    retrievedDepartment.organization.id,
    organizationId,
  );
}
