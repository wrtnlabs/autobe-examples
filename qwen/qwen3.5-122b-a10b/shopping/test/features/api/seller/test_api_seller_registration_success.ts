import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test successful seller registration with valid credentials and approval workflow.
 *
 * Validates the complete seller registration flow including account creation, profile generation, and approval request submission. Ensures that the seller account is created with pending approval status and includes all required identity and authentication information.
 *
 * Special attention is given to verifying that the approval status is correctly set to 'pending', the seller profile is created with a shop name, and JWT tokens are properly returned for subsequent authenticated operations.
 *
 * 1. Create seller connection for registration.
 * 2. Register seller with valid email, password, and URI fields.
 * 3. Validates response includes seller identity (id, approval_status, profile).
 * 4. Validates approval_status is set to 'pending' for approval workflow.
 * 5. Validates seller profile exists with shop_name field.
 * 6. Validates JWT tokens (access, refresh, expired_at, refreshable_until) are returned.
 * 7. Validates timestamps (created_at, updated_at) are properly formatted.
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection for registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register seller with valid credentials
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Validate approval status is pending
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "is_suspended is false",
    seller.is_suspended === false,
  );
  TestValidator.predicate("is_banned is false", seller.is_banned === false);
  // 4. Validate seller profile exists with shop name
  TestValidator.predicate("profile exists", seller.profile !== null);
  if (seller.profile !== null) {
    typia.assert(seller.profile);
    TestValidator.predicate(
      "shop_name exists",
      seller.profile.shop_name.length > 0,
    );
  }
  // 5. Validate JWT tokens
  TestValidator.predicate(
    "access token exists",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    seller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      seller.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      seller.token.refreshable_until,
    ),
  );
  // 6. Validate token expiration is in the future
  const expiredAt = new Date(seller.token.expired_at);
  const refreshableUntil = new Date(seller.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
}
