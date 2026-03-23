import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful seller registration workflow.
 * 1. Register a new seller with valid credentials
 * 2. Verify seller account is created with pending approval status
 * 3. Verify authentication tokens are returned
 * 4. Validate seller profile information in response
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate valid seller registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16); // Meets complexity requirements
  const shopName = RandomGenerator.name(2); // At least 2 chars
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();
  // Register seller using utility function
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      shop_description: shopDescription,
      href,
      referrer,
      ip: ipAddress,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Validate response structure
  typia.assert(seller);
  // Verify seller profile information
  TestValidator.equals("seller ID is UUID", typeof seller.id, "string");
  TestValidator.equals("email matches input", seller.email, email);
  TestValidator.equals("shop name matches input", seller.shop_name, shopName);
  TestValidator.equals(
    "shop description matches input",
    seller.shop_description,
    shopDescription,
  );
  // Verify initial approval status is 'pending'
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // Verify account status is 'active'
  TestValidator.equals("account status is active", seller.status, "active");
  // Verify rejection reason is null (not rejected)
  TestValidator.equals(
    "rejection reason is null",
    seller.rejection_reason,
    null,
  );
  // Verify logo image is null (not set)
  TestValidator.equals("logo image is null", seller.logo_image, null);
  // Verify timestamps are present
  TestValidator.predicate("created_at is valid date-time", () => {
    const date = new Date(seller.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const date = new Date(seller.updated_at);
    return !isNaN(date.getTime());
  });
  // Verify authentication tokens are present
  TestValidator.predicate(
    "access token exists",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    seller.token.refresh.length > 0,
  );
  // Verify token expiration times
  TestValidator.predicate("access token expired_at is valid", () => {
    const date = new Date(seller.token.expired_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("refreshable_until is valid", () => {
    const date = new Date(seller.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // Verify access token expires in approximately 1 hour
  const now = new Date();
  const accessExpiredAt = new Date(seller.token.expired_at);
  const accessExpiryMinutes =
    (accessExpiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate("access token expires in ~1 hour", () => {
    return accessExpiryMinutes >= 55 && accessExpiryMinutes <= 65;
  });
  // Verify refresh token is valid for approximately 7 days
  const refreshableUntil = new Date(seller.token.refreshable_until);
  const refreshDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate("refresh token valid for ~7 days", () => {
    return refreshDays >= 6.5 && refreshDays <= 7.5;
  });
}
