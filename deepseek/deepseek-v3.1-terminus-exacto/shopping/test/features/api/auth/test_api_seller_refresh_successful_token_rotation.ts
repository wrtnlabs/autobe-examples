import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test successful token refresh scenario where a seller uses a valid refresh token
 * to obtain new access and refresh tokens with proper token rotation security.
 */
export async function test_api_seller_refresh_successful_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Create initial seller authentication session through join
  const initialConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_seller_join(initialConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(initialAuth);
  // Extract refresh token from initial authentication
  const oldRefreshToken = initialAuth.token.refresh;
  const oldAccessToken = initialAuth.token.access;
  const oldExpiredAt = initialAuth.token.expired_at;
  const oldRefreshableUntil = initialAuth.token.refreshable_until;
  // Use the refresh token to obtain new tokens with fresh connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await api.functional.ecommerce.auth.seller.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies IEcommerceSeller.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // Validate that new tokens are different from old tokens
  TestValidator.notEquals(
    "access token should be rotated",
    oldAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be rotated",
    oldRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Validate expiration timestamps are updated and properly newer
  TestValidator.notEquals(
    "expired_at should be updated",
    oldExpiredAt,
    refreshedAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated",
    oldRefreshableUntil,
    refreshedAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "new expired_at should be after old expired_at",
    new Date(refreshedAuth.token.expired_at) > new Date(oldExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable_until should be after old refreshable_until",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(oldRefreshableUntil),
  );
  // Validate that new timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "new expired_at should be in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "new refreshable_until should be in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
  // Validate seller profile information is preserved
  TestValidator.equals(
    "seller id should remain same",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "seller email should remain same",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "shop name should remain same",
    initialAuth.shop_name,
    refreshedAuth.shop_name,
  );
  TestValidator.equals(
    "shop description should remain same",
    initialAuth.shop_description,
    refreshedAuth.shop_description,
  );
  TestValidator.equals(
    "logo image url should remain same",
    initialAuth.logo_image_url,
    refreshedAuth.logo_image_url,
  );
  TestValidator.equals(
    "account status should remain same",
    initialAuth.account_status,
    refreshedAuth.account_status,
  );
  // Validate that old refresh token cannot be reused (token rotation)
  await TestValidator.error("old refresh token should be invalid", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await api.functional.ecommerce.auth.seller.refresh(invalidConnection, {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies IEcommerceSeller.IRefresh,
    });
  });
}
