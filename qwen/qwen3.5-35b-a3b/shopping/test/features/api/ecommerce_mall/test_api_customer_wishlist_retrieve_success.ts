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

export async function test_api_customer_wishlist_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create customer-specific connection with token
  const customerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: customerAuth.token.access,
    },
  };
  // 2. Generate a wishlist entry (includes product reference via internal preparation)
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerAuthenticatedConnection,
      {
        body: undefined,
      },
    );
  typia.assert(wishlistEntry);
  // 3. Retrieve the wishlist entry
  const retrievedWishlist =
    await api.functional.ecommerceMall.customer.wishlists.at(
      customerAuthenticatedConnection,
      {
        wishlistId: wishlistEntry.id,
      },
    );
  typia.assert(retrievedWishlist);
  // 4. Validation
  // Verify wishlist entry ID matches
  TestValidator.equals(
    "wishlist ID matches",
    retrievedWishlist.id,
    wishlistEntry.id,
  );
  // Verify customer reference matches authenticated customer
  TestValidator.equals(
    "customer ID matches",
    retrievedWishlist.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedWishlist.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer isBanned matches",
    retrievedWishlist.customer.isBanned,
    customerAuth.isBanned,
  );
  // Verify product reference matches added product
  TestValidator.equals(
    "product ID matches",
    retrievedWishlist.product.id,
    wishlistEntry.product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedWishlist.product.name,
    wishlistEntry.product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedWishlist.product.base_price,
    wishlistEntry.product.base_price,
  );
  TestValidator.equals(
    "product is_active matches",
    retrievedWishlist.product.is_active,
    wishlistEntry.product.is_active,
  );
  // Verify seller reference in product
  TestValidator.equals(
    "seller ID matches",
    retrievedWishlist.product.seller.id,
    wishlistEntry.product.seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedWishlist.product.seller.email,
    wishlistEntry.product.seller.email,
  );
  TestValidator.equals(
    "seller approval_status matches",
    retrievedWishlist.product.seller.approval_status,
    wishlistEntry.product.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended matches",
    retrievedWishlist.product.seller.is_suspended,
    wishlistEntry.product.seller.is_suspended,
  );
  TestValidator.equals(
    "seller is_banned matches",
    retrievedWishlist.product.seller.is_banned,
    wishlistEntry.product.seller.is_banned,
  );
  TestValidator.equals(
    "seller created_at matches",
    retrievedWishlist.product.seller.created_at,
    wishlistEntry.product.seller.created_at,
  );
  // Verify category reference in product
  TestValidator.equals(
    "category ID matches",
    retrievedWishlist.product.category.id,
    wishlistEntry.product.category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedWishlist.product.category.name,
    wishlistEntry.product.category.name,
  );
  TestValidator.equals(
    "category is_leaf matches",
    retrievedWishlist.product.category.is_leaf,
    wishlistEntry.product.category.is_leaf,
  );
  TestValidator.equals(
    "category created_at matches",
    retrievedWishlist.product.category.created_at,
    wishlistEntry.product.category.created_at,
  );
  TestValidator.equals(
    "category updated_at matches",
    retrievedWishlist.product.category.updated_at,
    wishlistEntry.product.category.updated_at,
  );
  TestValidator.equals(
    "category deleted_at matches",
    retrievedWishlist.product.category.deleted_at,
    wishlistEntry.product.category.deleted_at,
  );
  // Verify timestamps are valid ISO 8601 format
  TestValidator.equals(
    "created_at is valid datetime",
    retrievedWishlist.created_at,
    wishlistEntry.created_at,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    retrievedWishlist.updated_at,
    wishlistEntry.updated_at,
  );
  // Verify timestamps are recent (within last 60 seconds)
  const createdAtDate = new Date(retrievedWishlist.created_at);
  const updatedAtDate = new Date(retrievedWishlist.updated_at);
  const now = new Date();
  TestValidator.predicate(
    "created_at is recent",
    (now.getTime() - createdAtDate.getTime()) / 1000 < 60,
  );
  TestValidator.predicate(
    "updated_at is recent",
    (now.getTime() - updatedAtDate.getTime()) / 1000 < 60,
  );
  // Verify customer profile
  TestValidator.equals(
    "customer profile display name matches",
    retrievedWishlist.customer.customerProfile.displayName,
    wishlistEntry.customer.customerProfile.displayName,
  );
}
