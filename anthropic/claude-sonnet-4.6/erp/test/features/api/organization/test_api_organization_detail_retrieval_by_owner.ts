import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Create a new organization under the authenticated member
  const orgName = `TestOrg_${RandomGenerator.alphaNumeric(8)}`;
  const currency = "USD";
  const timezone = "America/New_York";
  const fiscalStartMonth = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: orgName,
          currency: currency,
          timezone: timezone,
          fiscal_start_month: fiscalStartMonth,
          description: null,
          logo_url: null,
        },
      },
    );
  typia.assert(organization);
  // Step 3: Retrieve the organization by ID
  const retrieved = await api.functional.erpHrm.member.organizations.at(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  typia.assert(retrieved);
  // Step 4: Validate the retrieved organization
  TestValidator.equals(
    "organization id matches",
    retrieved.id,
    organization.id,
  );
  TestValidator.equals("organization name matches", retrieved.name, orgName);
  TestValidator.equals(
    "organization currency matches",
    retrieved.currency,
    currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrieved.timezone,
    timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month matches",
    retrieved.fiscal_start_month,
    fiscalStartMonth,
  );
  TestValidator.equals(
    "organization description is null",
    retrieved.description,
    null,
  );
  TestValidator.equals(
    "organization logo_url is null",
    retrieved.logo_url,
    null,
  );
  TestValidator.equals(
    "organization deleted_at is null",
    retrieved.deleted_at,
    null,
  );
  // Validate owner
  TestValidator.equals(
    "owner status is active",
    retrieved.owner.status,
    "active",
  );
  TestValidator.equals(
    "owner member email matches",
    retrieved.owner.member.email,
    memberEmail,
  );
  TestValidator.predicate(
    "owner role is builtin",
    retrieved.owner.role.is_builtin === true,
  );
}
