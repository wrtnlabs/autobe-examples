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
 * Test seller refresh token renewal and token rotation.
 *
 * Verifies that a newly registered seller can renew an active session using the issued refresh token without re-entering the password. The test checks that the refresh endpoint returns the same seller identity while rotating the access token, refresh token, and expiration metadata.
 *
 * The scenario also confirms the returned authorization payload is structurally valid and that the renewal flow works while the original session is still active.
 *
 * 1. Register a seller and capture the initial authorization bundle.
 * 2. Call the refresh endpoint with the issued refresh token.
 * 3. Validate that identity is preserved and token values are rotated.
 */
export async function test_api_seller_refresh_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const originalAccess = joined.token.access;
  const originalRefresh = joined.token.refresh;
  const originalExpiredAt = joined.token.expired_at;
  const originalRefreshableUntil = joined.token.refreshable_until;
  const refreshed = await authorize_seller_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: originalRefresh,
      } satisfies IMallPlatformSeller.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals(
    "seller identity should remain the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email should remain the same",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "seller status should remain the same",
    refreshed.status.status,
    joined.status.status,
  );
  TestValidator.equals(
    "seller rejection reason should remain the same",
    refreshed.rejectionReason,
    joined.rejectionReason,
  );
  TestValidator.equals(
    "seller profile should remain the same",
    refreshed.sellerProfile.id,
    joined.sellerProfile.id,
  );
  TestValidator.notEquals(
    "access token should rotate",
    refreshed.token.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh token should rotate",
    refreshed.token.refresh,
    originalRefresh,
  );
  TestValidator.notEquals(
    "access expiration should be renewed",
    refreshed.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable deadline should be renewed",
    refreshed.token.refreshable_until,
    originalRefreshableUntil,
  );
}
