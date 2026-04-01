import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_settings_multi_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const update = {
    name: `${RandomGenerator.name()} Org`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl: "https://example.com/logo.png",
  } satisfies IErpHrmTimeOrganization.IUpdate;
  const organization =
    await api.functional.erpHrmTime.member.organizations.putByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: update,
      },
    );
  typia.assert(organization);
  TestValidator.equals(
    "organization id should match targeted id",
    organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name should reflect update",
    organization.name,
    update.name,
  );
  TestValidator.equals(
    "organization description should reflect update",
    organization.description,
    update.description,
  );
  TestValidator.equals(
    "organization logo should reflect update",
    organization.logoImageUrl,
    update.logoImageUrl,
  );
}
