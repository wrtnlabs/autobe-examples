import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller token refresh success scenario.
 *
 * Validates that a registered seller with an active account and valid refresh token
 * can successfully renew their authentication tokens without re-entering credentials.
 * This test verifies the complete token refresh workflow including:
 * - Seller registration to obtain initial tokens
 * - Token refresh using valid refresh token
 * - Response structure validation
 * - Token rotation (new tokens generated)
 */
export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller to obtain initial authentication tokens
  const sellerConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registration);
  // Store original refresh token for comparison
  const originalRefreshToken = registration.token.refresh;
  // 2. Create new connection for refresh operation (connection isolation)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Refresh the token using the valid refresh token
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IEcommerceMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  // 4. Verify token rotation - new tokens should be different from original
  TestValidator.notEquals(
    "access token rotated",
    registration.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshed.token.refresh,
  );
  // 5. Verify seller identity is preserved after refresh
  TestValidator.equals("seller ID preserved", registration.id, refreshed.id);
  TestValidator.equals(
    "shop name preserved",
    registration.shop_name,
    refreshed.shop_name,
  );
  TestValidator.equals(
    "email preserved",
    registration.seller.email,
    refreshed.seller.email,
  );
  // 6. Verify seller account status is active
  TestValidator.predicate(
    "account status is active",
    refreshed.account_status === "active",
  );
  TestValidator.predicate(
    "approval status exists",
    refreshed.approval_status === "pending" ||
      refreshed.approval_status === "approved" ||
      refreshed.approval_status === "rejected",
  );
  // 7. Verify token expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshed.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshed.token.refreshable_until,
    ),
  );
  // 8. Verify seller summary contains required fields
  TestValidator.equals(
    "seller summary ID matches",
    refreshed.seller.id,
    refreshed.id,
  );
  TestValidator.equals(
    "seller summary email matches",
    refreshed.seller.email,
    registration.seller.email,
  );
  TestValidator.equals(
    "seller summary shop name matches",
    refreshed.seller.shop_name,
    refreshed.shop_name,
  );
}
