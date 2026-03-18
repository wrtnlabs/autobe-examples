import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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

export async function test_api_organization_creation_minimal_fields_korean_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member to obtain JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // Step 2: Create organization with minimal required fields (Korean context)
  const organizationName = `MinimalOrg_${RandomGenerator.alphaNumeric(8)}`;
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: organizationName,
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 3,
          // description and logo_url are intentionally omitted to test minimal fields
        },
      },
    );
  // Step 3: Validate response structure and types
  typia.assert(organization);
  // Step 4: Validate business rules - minimal fields correctly stored
  TestValidator.equals(
    "name matches input",
    organization.name,
    organizationName,
  );
  TestValidator.equals("currency is KRW", organization.currency, "KRW");
  TestValidator.equals(
    "timezone is Asia/Seoul",
    organization.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "fiscal_year_start_month is 3",
    organization.fiscal_year_start_month,
    3,
  );
  TestValidator.equals(
    "description defaults to null when omitted",
    organization.description,
    null,
  );
  TestValidator.equals(
    "logo_url defaults to null when omitted",
    organization.logo_url,
    null,
  );
  TestValidator.equals(
    "owner is the authenticated member",
    organization.owner.id,
    member.id,
  );
}
