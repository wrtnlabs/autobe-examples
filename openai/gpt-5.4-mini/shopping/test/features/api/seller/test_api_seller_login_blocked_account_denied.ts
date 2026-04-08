import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller login denial for accounts that are not allowed to sign in.
 *
 * Validates that a newly registered seller account cannot obtain an authenticated session while it remains in a blocked sign-in state. The scenario focuses on access control enforcement before token issuance and ensures that the login endpoint rejects moderation-ineligible accounts without returning authorization data.
 *
 * 1. Register a seller account with valid credentials.
 * 2. Attempt to log in from a separate seller connection without any approval flow.
 * 3. Confirm the login request is denied and no authorization payload is issued.
 */
export async function test_api_seller_login_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const credentials: IMallPlatformSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IMallPlatformSeller.IJoin;
  const joined = await authorize_seller_join(sellerConnection, {
    body: credentials,
  });
  typia.assert(joined);
  const blockedLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller login should be denied for a blocked or unapproved account",
    [400, 401, 403],
    async () => {
      await authorize_seller_login(blockedLoginConnection, {
        body: {
          email: credentials.email,
          password: credentials.password,
        } satisfies IMallPlatformSeller.ILogin,
      });
    },
  );
}
