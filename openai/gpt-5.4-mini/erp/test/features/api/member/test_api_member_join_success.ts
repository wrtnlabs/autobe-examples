import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Passw0rd!${RandomGenerator.alphabets(8)}`;
  const name = RandomGenerator.name();
  const body = {
    email,
    password,
    name,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, { body });
  typia.assert(authorized);
  TestValidator.equals("member email", authorized.email, email);
  TestValidator.equals("member display name", authorized.displayName, name);
  await TestValidator.error("duplicate member join must fail", async () => {
    const duplicateConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(duplicateConnection, { body });
  });
}
