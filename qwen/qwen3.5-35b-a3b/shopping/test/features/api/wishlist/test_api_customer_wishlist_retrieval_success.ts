import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistToCartRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistToCartRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_customer_wishlist_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication and registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create wishlist entry by adding a product to the customer's wishlist
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(wishlistEntry);
  // 3. Retrieve the wishlist entry using the returned wishlistId
  const retrievedWishlist =
    await api.functional.ecommerceMall.customer.wishlist.at(
      customerConnection,
      {
        wishlistId: wishlistEntry.id,
      },
    );
  typia.assert(retrievedWishlist);
  // 4. Validate the response contains complete wishlist entry data
  TestValidator.equals(
    "wishlist entry id",
    retrievedWishlist.id,
    wishlistEntry.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedWishlist.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedWishlist.updated_at !== undefined,
  );
  // Validate customer summary
  TestValidator.equals(
    "customer id matches",
    retrievedWishlist.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedWishlist.customer.email,
    customerAuth.email,
  );
  TestValidator.predicate(
    "customer has display name",
    retrievedWishlist.customer.display_name.length > 0,
  );
  TestValidator.equals(
    "customer is_banned matches",
    retrievedWishlist.customer.is_banned,
    customerAuth.is_banned,
  );
  TestValidator.equals(
    "customer created_at matches",
    retrievedWishlist.customer.created_at,
    customerAuth.created_at,
  );
  // Validate product summary
  TestValidator.equals(
    "product id matches",
    retrievedWishlist.product.id,
    wishlistEntry.product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedWishlist.product.name,
    wishlistEntry.product.name,
  );
  TestValidator.equals(
    "product basePrice matches",
    retrievedWishlist.product.basePrice,
    wishlistEntry.product.basePrice,
  );
  TestValidator.equals(
    "product is_active matches",
    retrievedWishlist.product.isActive,
    wishlistEntry.product.isActive,
  );
  // Validate product is active
  TestValidator.equals(
    "product is active",
    retrievedWishlist.product.isActive,
    true,
  );
  // Validate category information (JOIN)
  TestValidator.predicate(
    "category id exists",
    retrievedWishlist.product.category.id !== undefined,
  );
  TestValidator.predicate(
    "category name exists",
    retrievedWishlist.product.category.name.length > 0,
  );
  TestValidator.equals(
    "category id is uuid",
    true,
    retrievedWishlist.product.category.id.length > 0,
  );
  // Validate seller information (JOIN)
  TestValidator.predicate(
    "seller id exists",
    retrievedWishlist.product.seller.id !== undefined,
  );
  TestValidator.predicate(
    "seller email is valid",
    retrievedWishlist.product.seller.email.length > 0,
  );
  TestValidator.equals(
    "seller id is uuid",
    true,
    retrievedWishlist.product.seller.id.length > 0,
  );
  // 5. Verify customer ownership
  TestValidator.equals(
    "customer id matches authenticated user",
    retrievedWishlist.customer.id,
    customerAuth.id,
  );
  // 6. Cleanup - delete the wishlist entry
  await api.functional.ecommerceMall.customer.wishlist.erase(
    customerConnection,
    {
      wishlistId: retrievedWishlist.id,
    },
  );
}