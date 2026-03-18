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

export async function test_api_organization_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // === SETUP: Register and authenticate a new member ===
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
    },
  });
  typia.assert(joinResult);
  // === PRIMARY TEST: Create organization with required fields only ===
  const orgName = `TestOrg-${RandomGenerator.alphaNumeric(8)}`;
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: orgName,
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org1);
  // Validate business logic for required-fields-only organization
  TestValidator.equals("org name matches", org1.name, orgName);
  TestValidator.equals("org currency matches", org1.currency, "USD");
  TestValidator.equals(
    "org timezone matches",
    org1.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "org fiscal_start_month matches",
    org1.fiscal_start_month,
    1,
  );
  TestValidator.equals("org description is null", org1.description, null);
  TestValidator.equals("org logo_url is null", org1.logo_url, null);
  TestValidator.equals("org deleted_at is null", org1.deleted_at, null);
  // Validate owner fields
  TestValidator.equals(
    "owner email matches member email",
    org1.owner.member.email,
    memberEmail,
  );
  TestValidator.equals("owner status is active", org1.owner.status, "active");
  TestValidator.predicate("owner role is builtin", org1.owner.role.is_builtin);
  // === EXTENDED TEST: Create organization with optional fields ===
  const org2Name = `TestOrgFull-${RandomGenerator.alphaNumeric(8)}`;
  const org2Description = "A test organization with description";
  const org2LogoUrl = "https://example.com/logo.png";
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: org2Name,
        currency: "EUR",
        timezone: "Asia/Seoul",
        fiscal_start_month: 4,
        description: org2Description,
        logo_url: org2LogoUrl,
      },
    },
  );
  typia.assert(org2);
  TestValidator.equals("org2 name matches", org2.name, org2Name);
  TestValidator.equals(
    "org2 description matches",
    org2.description,
    org2Description,
  );
  TestValidator.equals("org2 logo_url matches", org2.logo_url, org2LogoUrl);
  TestValidator.equals("org2 currency matches", org2.currency, "EUR");
  TestValidator.equals("org2 timezone matches", org2.timezone, "Asia/Seoul");
  // === EDGE CASE: fiscal_start_month = 12 (maximum boundary) ===
  const org3Name = `TestOrgMax-${RandomGenerator.alphaNumeric(8)}`;
  const org3 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: org3Name,
        currency: "KRW",
        timezone: "Asia/Tokyo",
        fiscal_start_month: 12,
      },
    },
  );
  typia.assert(org3);
  TestValidator.equals(
    "org3 fiscal_start_month is 12",
    org3.fiscal_start_month,
    12,
  );
  TestValidator.equals("org3 deleted_at is null", org3.deleted_at, null);
}
