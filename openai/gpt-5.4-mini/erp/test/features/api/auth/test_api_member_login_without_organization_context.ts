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

export async function test_api_member_login_without_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!" satisfies string & tags.Format<"password">;
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://${joinConnection.host}`,
      referrer: `https://${joinConnection.host}`,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IErpHrmTimeMember.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "member id should remain the same after login",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "member email should remain the same after login",
    authorized.email,
    email,
  );
}
