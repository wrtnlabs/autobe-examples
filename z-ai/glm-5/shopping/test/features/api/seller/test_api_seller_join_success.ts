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
 * Test successful seller registration with complete shop profile information.
 *
 * This test validates the seller join workflow:
 * 1. Seller registers with valid email, password, and shop details
 * 2. Response contains seller profile with pending approval status
 * 3. JWT tokens are generated for future authentication
 */
export async function test_api_seller_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Prepare seller registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const shopDescription = RandomGenerator.paragraph({ sentences: 3 });
  const logoUrl = typia.random<string & tags.Format<"url">>();
  // Execute seller join using utility function
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      shop_description: shopDescription,
      logo_url: logoUrl,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Validate response structure
  typia.assert(seller);
  // Verify seller profile data
  TestValidator.equals("email matches", seller.email, email);
  TestValidator.equals("shop name matches", seller.shopName, shopName);
  TestValidator.equals(
    "approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  TestValidator.equals("deleted at is null", seller.deletedAt, null);
  // Verify shop description and logo
  TestValidator.equals(
    "shop description matches",
    seller.shopDescription,
    shopDescription,
  );
  TestValidator.equals("logo url matches", seller.logoUrl, logoUrl);
  // Verify token structure exists
  TestValidator.predicate(
    "access token exists",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    seller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(seller.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(seller.token.refreshable_until).getTime() > 0,
  );
  // Verify timestamps
  TestValidator.predicate(
    "created at is valid",
    new Date(seller.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at is valid",
    new Date(seller.updatedAt).getTime() > 0,
  );
}