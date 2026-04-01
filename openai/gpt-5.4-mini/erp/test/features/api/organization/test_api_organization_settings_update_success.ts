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

export async function test_api_organization_settings_update_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `owner_${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}` as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const settings =
    await api.functional.erpHrmTime.member.organizations.settings.update(
      memberConnection,
      {
        organizationId: authorized.id,
        body: {
          currency_code: "EUR",
          timezone: "Europe/Berlin",
          fiscal_start_month: 4,
        } satisfies IErpHrmTimeOrganizationSetting.IUpdate,
      },
    );
  typia.assert(settings);
  TestValidator.equals(
    "organization id is preserved",
    settings.organization.id,
    authorized.id,
  );
  TestValidator.equals(
    "currency code is updated",
    settings.currencyCode,
    "EUR",
  );
  TestValidator.equals(
    "timezone is updated",
    settings.timezone,
    "Europe/Berlin",
  );
  TestValidator.equals(
    "fiscal start month is updated",
    settings.fiscalStartMonth,
    4,
  );
}
