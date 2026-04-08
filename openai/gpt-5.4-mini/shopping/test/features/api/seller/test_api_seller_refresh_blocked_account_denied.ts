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

export async function test_api_seller_refresh_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that seller session renewal is denied when the refresh credential
   * is not valid for continuing the session.
   *
   * The provided API surface does not expose a seller-blocking or account-
   * suspension operation, so this test rewrites the original blocked-account
   * scenario into the strongest supported denial case: an invalid refresh
   * token must be rejected and must not extend the seller session.
   *
   * 1. Register a new seller account and capture the issued refresh token.
   * 2. Tamper with the refresh token to simulate a non-eligible session.
   * 3. Attempt to refresh the seller session with the invalid token.
   * 4. Confirm the refresh request is rejected.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const registered: IMallPlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password1234!",
      } satisfies IMallPlatformSeller.IJoin,
    });
  typia.assert(registered);
  const blockedRefreshToken: IMallPlatformSeller.IRefresh = {
    refreshToken: `${registered.token.refresh}blocked`,
  };
  await TestValidator.error(
    "seller refresh should reject an invalid or blocked session token",
    async () => {
      await authorize_seller_refresh(sellerConnection, {
        body: blockedRefreshToken,
      });
    },
  );
}
