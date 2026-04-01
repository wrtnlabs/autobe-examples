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

export async function test_api_organization_settings_upsert_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    currencyCode: "USD",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 1,
  } satisfies IErpHrmTimeOrganizationSetting.ICreate;
  const firstResponse =
    await generate_random_erp_hrm_time_member_organizations_settings_create(
      authorizedConnection,
      {
        params: { organizationId },
        body: firstBody,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "organization id",
    firstResponse.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "currency code",
    firstResponse.currencyCode,
    firstBody.currencyCode,
  );
  TestValidator.equals("timezone", firstResponse.timezone, firstBody.timezone);
  TestValidator.equals(
    "fiscal start month",
    firstResponse.fiscalStartMonth,
    firstBody.fiscalStartMonth,
  );
  const secondBody = {
    currencyCode: "KRW",
    timezone: "Asia/Seoul",
    fiscalStartMonth: 7,
  } satisfies IErpHrmTimeOrganizationSetting.ICreate;
  const secondResponse =
    await generate_random_erp_hrm_time_member_organizations_settings_create(
      authorizedConnection,
      {
        params: { organizationId },
        body: secondBody,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "organization id after upsert",
    secondResponse.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "currency code after upsert",
    secondResponse.currencyCode,
    secondBody.currencyCode,
  );
  TestValidator.equals(
    "timezone after upsert",
    secondResponse.timezone,
    secondBody.timezone,
  );
  TestValidator.equals(
    "fiscal start month after upsert",
    secondResponse.fiscalStartMonth,
    secondBody.fiscalStartMonth,
  );
  TestValidator.notEquals(
    "settings record should be replaced",
    firstResponse.updatedAt,
    secondResponse.updatedAt,
  );
}
