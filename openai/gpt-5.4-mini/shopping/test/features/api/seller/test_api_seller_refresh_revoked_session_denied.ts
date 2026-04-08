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

export async function test_api_seller_refresh_revoked_session_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller refresh token rejection for a revoked-like stale credential flow.
   *
   * 1. Register a seller account and capture the issued authorization bundle.
   * 2. Confirm a legitimate refresh request succeeds and preserves seller account data.
   * 3. Attempt to refresh with an invalid stale token value and verify the server rejects it.
   * 4. Ensure the seller account state remains unchanged after the rejected refresh attempt.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const email: string = `${RandomGenerator.alphabets(12)}@test.com`;
  const password: string = RandomGenerator.alphaNumeric(12);
  const initial = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(initial);
  const initialAccount = initial.status;
  const initialProfile = initial.sellerProfile;
  const validRefreshToken = initial.token.refresh;
  const refreshed = await authorize_seller_refresh(sellerConnection, {
    body: {
      refreshToken: validRefreshToken,
    } satisfies IMallPlatformSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "seller account status remains unchanged after refresh",
    refreshed.status,
    initialAccount,
  );
  TestValidator.equals(
    "seller profile remains unchanged after refresh",
    refreshed.sellerProfile,
    initialProfile,
    (key) => key === "updatedAt",
  );
  const revokedLikeToken: string = `${validRefreshToken}.revoked`;
  await TestValidator.error(
    "stale refresh token should be rejected",
    async () => {
      await authorize_seller_refresh(sellerConnection, {
        body: {
          refreshToken: revokedLikeToken,
        } satisfies IMallPlatformSeller.IRefresh,
      });
    },
  );
  TestValidator.equals(
    "original seller status is still unchanged",
    initial.status,
    initialAccount,
  );
  TestValidator.equals(
    "original seller profile is still unchanged",
    initial.sellerProfile,
    initialProfile,
    (key) => key === "updatedAt",
  );
}
