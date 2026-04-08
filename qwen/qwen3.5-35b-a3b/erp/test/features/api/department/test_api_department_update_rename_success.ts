import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_department_update_rename_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) satisfies
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Extract organization ID from the member's first session
  const organizationId = member.sessions?.[0]?.organization?.id;
  TestValidator.notEquals("organization id should exist", organizationId, null);
  if (!organizationId) {
    throw new Error("Organization ID not found in session");
  }
  // 2. Create department in the organization
  const department =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
        },
        params: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(department);
  const oldUpdatedAt = department.updated_at;
  // 3. Update department name
  const updatedDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberConnection,
      {
        organizationId: organizationId,
        departmentId: department.id,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }),
        },
      },
    );
  typia.assert(updatedDepartment);
  // 4. Validate the update
  TestValidator.notEquals(
    "department name should be changed",
    department.name,
    updatedDepartment.name,
  );
  TestValidator.equals(
    "department id should remain unchanged",
    department.id,
    updatedDepartment.id,
  );
  TestValidator.equals(
    "organization id should remain unchanged",
    department.organization.id,
    updatedDepartment.organization.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    department.created_at,
    updatedDepartment.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be refreshed",
    oldUpdatedAt,
    updatedDepartment.updated_at,
  );
  TestValidator.equals(
    "parent department id should remain unchanged",
    department.parentDepartment?.id ?? null,
    updatedDepartment.parentDepartment?.id ?? null,
  );
}
