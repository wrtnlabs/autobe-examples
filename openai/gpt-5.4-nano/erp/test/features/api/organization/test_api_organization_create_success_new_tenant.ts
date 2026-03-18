import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";

export async function test_api_organization_create_success_new_tenant(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.alphabets(12)}@example.com`;
  const password = `P@ssw0rd_${RandomGenerator.alphabets(8)}`;
  const joinOrganizationName = `bootstrap_${RandomGenerator.alphabets(16)}`;
  const joinOrganizationDescription = `bootstrap_desc_${RandomGenerator.alphabets(24)}`;
  const joinLogoUrl = `https://example.com/logo/${RandomGenerator.alphabets(10)}.png`;
  const timezone = "Asia/Seoul";
  const currencyCode = "USD";
  const fiscalStartMonth = 6 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail satisfies string & tags.Format<"email">,
      password,
      organizationName: joinOrganizationName,
      organizationDescription: joinOrganizationDescription,
      organizationLogoUrl: joinLogoUrl,
      organizationCurrencyCode: currencyCode,
      organizationTimezone: timezone,
      organizationFiscalStartMonth: fiscalStartMonth,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: "203.0.113.10" satisfies string & tags.Format<"ipv4">,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const tenantConnection: api.IConnection = { host: connection.host };
  tenantConnection.headers = {
    authorization: `Bearer ${authorized.token.access}`,
  };
  const organizationName = `tenant_${RandomGenerator.alphabets(16)}`;
  const organizationDescription = `desc_${RandomGenerator.alphabets(24)}`;
  const logoUrl = `https://example.com/logo/${RandomGenerator.alphabets(10)}.png`;
  const organization =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      tenantConnection,
      {
        body: {
          name: organizationName,
          description: organizationDescription,
          logo_url: logoUrl,
          currency_code: currencyCode,
          timezone: timezone,
          fiscal_start_month: fiscalStartMonth,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  TestValidator.predicate(
    "organization id should be present",
    () => organization.id.length > 0,
  );
  TestValidator.equals(
    "organization deleted_at is null",
    organization.deleted_at,
    null,
  );
  TestValidator.equals(
    "organization name matches",
    organization.name,
    organizationName,
  );
  TestValidator.equals(
    "organization description matches",
    organization.description,
    organizationDescription,
  );
  TestValidator.equals(
    "organization logo_url matches",
    organization.logo_url,
    logoUrl,
  );
  TestValidator.equals(
    "organization currency_code matches",
    organization.currency_code,
    currencyCode,
  );
  TestValidator.equals(
    "organization timezone matches",
    organization.timezone,
    timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month matches",
    organization.fiscal_start_month,
    fiscalStartMonth,
  );
}
