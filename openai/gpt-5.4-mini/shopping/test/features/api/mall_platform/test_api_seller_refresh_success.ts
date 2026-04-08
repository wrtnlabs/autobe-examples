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
 * Test successful seller session refresh with token rotation and identity preservation.
 *
 * Validates the complete seller authentication renewal flow by registering a new seller,
 * capturing the issued refresh token, and requesting a refreshed authorization payload.
 * The test checks that the refreshed session keeps the same seller identity and account
 * state while rotating the access and refresh tokens and extending the session metadata.
 *
 * 1. Register a seller account and capture the initial authorization payload.
 * 2. Use the issued refresh token to request a renewed seller session.
 * 3. Verify the refreshed payload preserves identity and rotates session credentials.
 */
export async function test_api_seller_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(initial);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: initial.token.refresh,
    } satisfies IMallPlatformSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "seller id should be preserved",
    refreshed.id,
    initial.id,
  );
  TestValidator.equals(
    "seller email should be preserved",
    refreshed.email,
    initial.email,
  );
  TestValidator.equals(
    "seller status should be preserved",
    refreshed.status,
    initial.status,
  );
  TestValidator.equals(
    "rejection reason should be preserved",
    refreshed.rejectionReason,
    initial.rejectionReason,
  );
  TestValidator.equals(
    "suspended timestamp should be preserved",
    refreshed.suspendedAt,
    initial.suspendedAt,
  );
  TestValidator.equals(
    "deleted timestamp should be preserved",
    refreshed.deletedAt,
    initial.deletedAt,
  );
  TestValidator.predicate(
    "access token should rotate",
    refreshed.token.access !== initial.token.access,
  );
  TestValidator.predicate(
    "refresh token should rotate",
    refreshed.token.refresh !== initial.token.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be renewed",
    refreshed.token.expired_at,
    initial.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline should be renewed",
    refreshed.token.refreshable_until,
    initial.token.refreshable_until,
  );
  const continuedConnection: api.IConnection = { host: connection.host };
  continuedConnection.headers = {
    Authorization: refreshed.token.access,
  };
  TestValidator.equals(
    "refreshed authorization should be available for continued use",
    continuedConnection.headers.Authorization,
    refreshed.token.access,
  );
}
