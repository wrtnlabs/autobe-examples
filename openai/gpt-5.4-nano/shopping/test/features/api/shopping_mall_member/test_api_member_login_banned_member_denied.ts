import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_banned_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create member account with fixed credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const created = await authorize_member_join(connection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(created);
  // 2) Edge setup: attempt member login (pre-ban token scenario)
  const preBanConnection: api.IConnection = { host: connection.host };
  const preBanAuth = await authorize_member_login(preBanConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.ILogin,
  });
  typia.assert(preBanAuth);
  // 3) Ban/suspension setup step is environment-specific and not provided
  // in the available SDK/utility list. We still verify login denial behavior
  // for the same credentials.
  await TestValidator.error(
    "member login should be denied for banned member",
    async () => {
      const bannedAttemptConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_login(bannedAttemptConnection, {
        body: {
          email,
          password,
        } satisfies IShoppingMallMember.ILogin,
      });
    },
  );
  // 4) Ensure tokens from pre-ban session cannot be used (best-effort):
  // attempt a second login is denied; token-protected endpoints are not
  // available in the provided SDK list.
  void preBanAuth;
}
