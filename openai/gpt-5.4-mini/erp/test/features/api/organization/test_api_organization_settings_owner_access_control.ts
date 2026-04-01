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

export async function test_api_organization_settings_owner_access_control(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!" satisfies string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  const updatedOrganization =
    await api.functional.erpHrmTime.member.organizations.patch(
      ownerConnection,
      {
        body: {
          name: `${ownerAuthorized.displayName} Organization`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: "https://example.com/logo.png",
        } satisfies IErpHrmTimeOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  TestValidator.equals(
    "organization name updated",
    updatedOrganization.name,
    `${ownerAuthorized.displayName} Organization`,
  );
  TestValidator.equals(
    "organization description updated",
    updatedOrganization.description,
    updatedOrganization.description,
  );
  TestValidator.equals(
    "organization logo updated",
    updatedOrganization.logoImageUrl,
    "https://example.com/logo.png",
  );
}
