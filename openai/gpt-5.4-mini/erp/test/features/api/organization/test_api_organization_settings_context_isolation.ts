import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_organizations_settings_create } from "../../../generate/generate_random_erp_hrm_time_member_organizations_settings_create";
import { prepare_random_erp_hrm_time_organization_setting } from "../../../prepare/prepare_random_erp_hrm_time_organization_setting";

export async function test_api_organization_settings_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberName = RandomGenerator.name();
  const memberPassword = "Aa1!aaaa";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      name: memberName,
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const memberContextConnection: api.IConnection = { host: connection.host };
  memberContextConnection.headers = {
    Authorization: authorized.token.access,
  };
  const primaryOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const foreignOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const missingOrganizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const primaryBody = {
    currencyCode: "USD",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 1,
  } satisfies IErpHrmTimeOrganizationSetting.ICreate;
  const created =
    await api.functional.erpHrmTime.member.organizations.settings.create(
      memberContextConnection,
      {
        organizationId: primaryOrganizationId,
        body: primaryBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "primary organization id",
    created.organization.id,
    primaryOrganizationId,
  );
  TestValidator.equals(
    "primary currency code",
    created.currencyCode,
    primaryBody.currencyCode,
  );
  TestValidator.equals(
    "primary timezone",
    created.timezone,
    primaryBody.timezone,
  );
  TestValidator.equals(
    "primary fiscal start month",
    created.fiscalStartMonth,
    primaryBody.fiscalStartMonth,
  );
  await TestValidator.httpError(
    "reject foreign organization update by context isolation",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.organizations.settings.create(
        memberContextConnection,
        {
          organizationId: foreignOrganizationId,
          body: {
            currencyCode: "EUR",
            timezone: "Asia/Tokyo",
            fiscalStartMonth: 4,
          } satisfies IErpHrmTimeOrganizationSetting.ICreate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject nonexistent organization id",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.organizations.settings.create(
        memberContextConnection,
        {
          organizationId: missingOrganizationId,
          body: {
            currencyCode: "KRW",
            timezone: "Asia/Tokyo",
            fiscalStartMonth: 12,
          } satisfies IErpHrmTimeOrganizationSetting.ICreate,
        },
      );
    },
  );
  const unchanged =
    await api.functional.erpHrmTime.member.organizations.settings.create(
      memberContextConnection,
      {
        organizationId: primaryOrganizationId,
        body: primaryBody,
      },
    );
  typia.assert(unchanged);
  TestValidator.equals(
    "settings remain scoped to the primary organization",
    unchanged.organization.id,
    primaryOrganizationId,
  );
  TestValidator.equals(
    "settings currency remains unchanged",
    unchanged.currencyCode,
    primaryBody.currencyCode,
  );
  TestValidator.equals(
    "settings timezone remains unchanged",
    unchanged.timezone,
    primaryBody.timezone,
  );
  TestValidator.equals(
    "settings fiscal month remains unchanged",
    unchanged.fiscalStartMonth,
    primaryBody.fiscalStartMonth,
  );
}
