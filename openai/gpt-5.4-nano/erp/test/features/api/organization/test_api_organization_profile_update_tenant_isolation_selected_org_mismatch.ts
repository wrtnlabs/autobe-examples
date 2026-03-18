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

export async function test_api_organization_profile_update_tenant_isolation_selected_org_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword!234567",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://${RandomGenerator.alphabets(8)}.example.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.example.com/ref`,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  const org1 =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org1-${RandomGenerator.alphabets(8)}`,
          description: `desc1-${RandomGenerator.alphabets(8)}`,
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(org1);
  const org2 =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `org2-${RandomGenerator.alphabets(8)}`,
          description: `desc2-${RandomGenerator.alphabets(8)}`,
          logo_url: null,
          currency_code: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(org2);
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: org1.name,
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  const forbiddenUpdate: IErpHrmTimeTrackingOrganization.IUpdate = {
    name: `org2-${RandomGenerator.alphabets(8)}-forbidden`,
    description: `org2-desc-${RandomGenerator.alphabets(8)}-forbidden`,
    logo_url: null,
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IErpHrmTimeTrackingOrganization.IUpdate;
  await TestValidator.error(
    "tenant isolation prevents updating non-selected organization",
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.update(
        memberConnection,
        {
          organizationId: org2.id,
          body: forbiddenUpdate,
        },
      );
    },
  );
  await api.functional.erpHrmTimeTracking.member.organizations.updateOrganization(
    memberConnection,
    {
      body: {
        name: org2.name,
      } satisfies IErpHrmTimeTrackingOrganization.IUpdate,
    },
  );
  const allowedUpdate: IErpHrmTimeTrackingOrganization.IUpdate = {
    name: `org2-${RandomGenerator.alphabets(8)}-allowed`,
    description: `org2-desc-${RandomGenerator.alphabets(8)}-allowed`,
    logo_url: null,
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IErpHrmTimeTrackingOrganization.IUpdate;
  const updatedOrg2 =
    await api.functional.erpHrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId: org2.id,
        body: allowedUpdate,
      },
    );
  typia.assert(updatedOrg2);

  TestValidator.equals(
    "allowed update applies name",
    updatedOrg2.name,
    allowedUpdate.name,
  );
  TestValidator.equals(
    "allowed update applies description",
    updatedOrg2.description,
    allowedUpdate.description,
  );
  TestValidator.equals(
    "allowed update applies logo_url",
    updatedOrg2.logo_url,
    typia.assert<(string & tags.Format<"uri">) | null | undefined>(
      allowedUpdate.logo_url,
    ),
  );
  TestValidator.equals(
    "allowed update applies currency_code",
    updatedOrg2.currency_code,
    allowedUpdate.currency_code,
  );
  TestValidator.equals(
    "allowed update applies timezone",
    updatedOrg2.timezone,
    allowedUpdate.timezone,
  );
  TestValidator.equals(
    "allowed update applies fiscal_start_month",
    updatedOrg2.fiscal_start_month,
    allowedUpdate.fiscal_start_month,
  );
}
