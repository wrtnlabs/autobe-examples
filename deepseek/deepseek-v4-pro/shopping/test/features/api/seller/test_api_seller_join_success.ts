import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful seller registration and verify the complete authorization response.
 *
 * Validates that a new seller can register with valid credentials and receives a complete authorization response containing seller identity, profile, and authentication tokens. The test verifies all business-logic fields match the expected state for a newly registered seller awaiting administrator approval.
 *
 * 1. Prepare seller registration credentials with a unique email, valid password, and session context fields (href, referrer, ip).
 * 2. Call authorize_seller_join to register and authenticate the seller.
 * 3. Validate the response via typia.assert for full type conformance.
 * 4. Verify business-logic fields: approval_status is "pending", all nullable timestamp fields are null, profile display fields are null.
 * 5. Verify token structure: access and refresh tokens are non-empty and distinct, both expiration timestamps are in the future with refreshable_until extending beyond expired_at.
 */
export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = "https://shop.example.com/seller/register";
  const referrer = "https://shop.example.com/";
  const ip = "192.168.1.100";
  const output = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(output);
  // Verify seller identity
  TestValidator.equals("email matches input", output.email, email);
  TestValidator.equals(
    "approval status is pending",
    output.approval_status,
    "pending",
  );
  TestValidator.equals(
    "rejection reason is null",
    output.rejection_reason,
    null,
  );
  TestValidator.equals("suspended at is null", output.suspended_at, null);
  TestValidator.equals("banned at is null", output.banned_at, null);
  TestValidator.equals("deleted at is null", output.deleted_at, null);
  // Verify profile
  TestValidator.equals("shop name is null", output.profile.shop_name, null);
  TestValidator.equals(
    "shop description is null",
    output.profile.shop_description,
    null,
  );
  TestValidator.equals(
    "logo image uri is null",
    output.profile.logo_image_uri,
    null,
  );
  // Verify token
  TestValidator.predicate(
    "access token is non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    output.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "tokens are distinct",
    output.token.access,
    output.token.refresh,
  );
  const now = new Date();
  const expiredAt = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
