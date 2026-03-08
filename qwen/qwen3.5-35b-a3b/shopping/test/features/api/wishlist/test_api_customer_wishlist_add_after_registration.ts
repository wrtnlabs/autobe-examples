import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_customer_wishlist_add_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Step 2: Verify customer was created successfully
  TestValidator.notEquals(
    "customer should be created",
    customerAuth,
    undefined,
  );
  TestValidator.equals("customer id is uuid", customerAuth.id.length, 36);
  // Step 3: Browse available products (simulate by generating random product IDs)
  // Note: GET /ecommerceMall/products is not in API list, so we generate random product IDs
  const firstProductId = typia.random<string & tags.Format<"uuid">>();
  const secondProductId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Add first product to wishlist
  const firstWishlistEntry =
    await api.functional.ecommerceMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          product_id: firstProductId,
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(firstWishlistEntry);
  // Step 5: Verify first wishlist entry
  TestValidator.equals(
    "first wishlist entry customer matches registered customer",
    firstWishlistEntry.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "first wishlist entry product_id matches",
    firstWishlistEntry.product.id,
    firstProductId,
  );
  TestValidator.predicate(
    "first wishlist has valid creation timestamp",
    new Date(firstWishlistEntry.created_at) <= new Date(),
  );
  // Step 6: Add second different product to the same wishlist
  const secondWishlistEntry =
    await api.functional.ecommerceMall.customer.wishlists.create(
      customerConnection,
      {
        body: {
          product_id: secondProductId,
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(secondWishlistEntry);
  // Step 7: Verify second wishlist entry
  TestValidator.equals(
    "second wishlist entry customer matches registered customer",
    secondWishlistEntry.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "second wishlist entry product_id matches",
    secondWishlistEntry.product.id,
    secondProductId,
  );
  TestValidator.predicate(
    "second wishlist has valid creation timestamp",
    new Date(secondWishlistEntry.created_at) <= new Date(),
  );
  // Step 8: Verify multiple products in wishlist
  TestValidator.notEquals(
    "wishlist entries should have different products",
    firstWishlistEntry.product.id,
    secondWishlistEntry.product.id,
  );
  TestValidator.equals(
    "both entries belong to same customer",
    firstWishlistEntry.customer.id,
    secondWishlistEntry.customer.id,
  );
  // Step 9: Verify customer profile in wishlist entries
  TestValidator.predicate(
    "wishlist entry has customer profile",
    firstWishlistEntry.customer.customerProfile !== undefined,
  );
  TestValidator.predicate(
    "customer profile has display name",
    firstWishlistEntry.customer.customerProfile.displayName.length > 0,
  );
  // Step 10: Verify all timestamps are properly recorded
  TestValidator.predicate(
    "first entry created before or same time as second",
    new Date(firstWishlistEntry.created_at) <=
      new Date(secondWishlistEntry.created_at),
  );
  TestValidator.equals(
    "both entries have same updated_at (newly created)",
    firstWishlistEntry.updated_at,
    firstWishlistEntry.created_at,
  );
}