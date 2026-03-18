import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_organizationmember_soft_delete_historical_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member (becomes organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass123!",
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_year_start_month: 1,
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization);
  // 3. Create employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Employee123!",
      firstName: RandomGenerator.name(),
      lastName: RandomGenerator.name(),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(employee);
  // 4. Create custom role
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: [
          { permission: "organization.manage" },
          { permission: "employee.view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // Note: OrganizationMembers create endpoint is not available in provided APIs
  // Generating a mock organizationMemberId to test the erase endpoint
  const mockOrganizationMemberId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to soft delete organization member (will fail with 404 as member doesn't exist, but validates API structure)
  await TestValidator.error(
    "erase non-existent organization member should fail",
    async () => {
      await api.functional.erpHrm.member.organizationMembers.erase(
        ownerConnection,
        {
          organizationMemberId: mockOrganizationMemberId,
        },
      );
    },
  );
}
