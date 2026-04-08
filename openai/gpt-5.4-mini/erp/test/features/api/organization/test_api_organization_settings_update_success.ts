import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    currencyCode: "KRW",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 4,
  } satisfies IErpHrmTimeOrganizationSetting.IUpdate;
  const settings =
    await api.functional.erpHrmTime.member.organizations.settings.update(
      memberConnection,
      {
        organizationId,
        body,
      },
    );
  typia.assert(settings);
  TestValidator.equals(
    "organization id is preserved",
    settings.organization.id,
    settings.organization.id,
  );
  TestValidator.equals(
    "currency code is updated",
    settings.currencyCode,
    body.currencyCode,
  );
  TestValidator.equals("timezone is updated", settings.timezone, body.timezone);
  TestValidator.equals(
    "fiscal start month is updated",
    settings.fiscalStartMonth,
    body.fiscalStartMonth,
  );
  TestValidator.equals("settings remain active", settings.deletedAt, null);
  TestValidator.predicate(
    "createdAt is a date-time string",
    settings.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is a date-time string",
    settings.updatedAt.length > 0,
  );
}
