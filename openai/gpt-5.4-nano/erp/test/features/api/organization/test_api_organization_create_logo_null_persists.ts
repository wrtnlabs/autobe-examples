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

export async function test_api_organization_create_logo_null_persists(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1) Authenticate as a member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia
    .random<string & tags.Format<"email">>()
    .toLowerCase();
  const joinPayload = {
    email: memberEmail,
    password: "Password1234!",
    organizationName: `org_${RandomGenerator.alphabets(12)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinPayload });
  // 2) Create a new organization with logo_url explicitly set to null
  const createPayload = {
    name: `org_${RandomGenerator.alphabets(14)}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_url: null,
    currency_code: "USD",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IErpHrmTimeTrackingOrganization.ICreate;
  const created =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: createPayload,
      },
    );
  typia.assert(created);
  // 3) Validate persistence semantics and echoing
  TestValidator.equals("deleted_at is null", created.deleted_at, null);
  TestValidator.equals("logo_url is null", created.logo_url, null);
  TestValidator.equals("name matches", created.name, createPayload.name);
  TestValidator.equals(
    "description matches",
    created.description,
    createPayload.description,
  );
  TestValidator.equals(
    "currency_code matches",
    created.currency_code,
    createPayload.currency_code,
  );
  TestValidator.equals(
    "timezone matches",
    created.timezone,
    createPayload.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month matches",
    created.fiscal_start_month,
    createPayload.fiscal_start_month,
  );
}
