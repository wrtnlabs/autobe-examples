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

export async function test_api_timezone_rebuild_denied_for_non_owner_member(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!23456",
    organizationName: `org-${RandomGenerator.alphabets(10)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: RandomGenerator.pick([
      "USD",
      "KRW",
      "EUR",
      "JPY",
    ] as const),
    organizationTimezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
      "Europe/London",
    ] as const),
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    ip: "203.0.113.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const ownerAuth = await authorize_member_join(
    { host: connection.host },
    { body: ownerJoin },
  );
  typia.assert(ownerAuth);
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers ??= {};
  ownerConnection.headers.Authorization = ownerAuth.token.access;
  const organization =
    await api.functional.erpHrmTimeTracking.member.organizations.create(
      ownerConnection,
      {
        body: {
          name: ownerJoin.organizationName,
          description: ownerJoin.organizationDescription,
          logo_url: null,
          currency_code: ownerJoin.organizationCurrencyCode,
          timezone: ownerJoin.organizationTimezone,
          fiscal_start_month: ownerJoin.organizationFiscalStartMonth,
        } satisfies IErpHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const nonOwnerJoin: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!23456",
    organizationName: ownerJoin.organizationName,
    organizationDescription: ownerJoin.organizationDescription,
    organizationCurrencyCode: ownerJoin.organizationCurrencyCode,
    organizationTimezone: ownerJoin.organizationTimezone,
    organizationFiscalStartMonth: ownerJoin.organizationFiscalStartMonth,
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
    ip: "203.0.113.2",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const nonOwnerAuth = await authorize_member_join(
    { host: connection.host },
    { body: nonOwnerJoin },
  );
  typia.assert(nonOwnerAuth);
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  nonOwnerConnection.headers ??= {};
  nonOwnerConnection.headers.Authorization = nonOwnerAuth.token.access;
  const rebuildRequest: IErpHrmTimeTrackingOrganization.IRequest = {
    id: organization.id,
    page: null,
    limit: null,
  } satisfies IErpHrmTimeTrackingOrganization.IRequest;
  await TestValidator.httpError(
    "non-owner member should be denied to rebuild timezone",
    [401, 403],
    async () => {
      await api.functional.erpHrmTimeTracking.member.organizations.timezone.rebuild.processTimezoneRebuild(
        nonOwnerConnection,
        { body: rebuildRequest },
      );
    },
  );
}
