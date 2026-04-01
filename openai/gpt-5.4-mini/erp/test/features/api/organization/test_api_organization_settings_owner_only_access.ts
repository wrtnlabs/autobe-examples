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

export async function test_api_organization_settings_owner_only_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const settings = {
    currencyCode: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "UTC",
      "America/New_York",
    ] as const),
    fiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  } satisfies IErpHrmTimeOrganizationSetting.ICreate;
  await TestValidator.httpError(
    "non-owner cannot update organization settings",
    [401, 403],
    async () => {
      await generate_random_erp_hrm_time_member_organizations_settings_create(
        memberConnection,
        {
          params: { organizationId },
          body: settings,
        },
      );
    },
  );
}
