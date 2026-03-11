import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
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

export async function test_api_customer_wishlist_to_cart_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create customer account
  const customerAuthConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerAuthConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerAuth);
  // 2. Create customer connection with authorization token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // 3. Generate random wishlist entry ID and variant ID (simulating pre-existing data)
  const wishlistEntryId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 4. Transfer product from wishlist to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.wishlist_to_cart.transferFromWishlist(
      customerConnection,
      {
        body: {
          wishlistEntryId,
          variantId,
        } satisfies IEcommerceMallWishlistToCartRequest,
      },
    );
  typia.assert(cartItem);
  // 5. Validate cart item quantity is 1 (default for wishlist-to-cart)
  TestValidator.equals(
    "cart item quantity is 1 for wishlist transfer",
    cartItem.quantity,
    1,
  );
  // 6. Validate price is positive (captured at addition time)
  TestValidator.predicate("cart item price is positive", cartItem.price > 0);
  // 7. Validate variant ID matches request
  TestValidator.equals(
    "variant ID matches request",
    cartItem.variant.id,
    variantId,
  );
  // 8. Validate variant is active
  TestValidator.predicate("variant is active", cartItem.variant.isActive);
  // 9. Validate variant has stock
  TestValidator.predicate(
    "variant has stock",
    cartItem.variant.stockQuantity > 0,
  );
  // 10. Validate variant SKU code exists
  TestValidator.predicate(
    "variant has SKU code",
    cartItem.variant.skuCode.length > 0,
  );
  // 11. Validate variant option values exist
  TestValidator.predicate(
    "variant has option values",
    cartItem.variant.optionValues.length > 0,
  );
  // 12. Validate parent product ID format
  TestValidator.equals(
    "parent product ID format",
    cartItem.variant.product.id,
    cartItem.variant.product.id,
  );
  // 13. Validate product name is not empty
  TestValidator.predicate(
    "product name is not empty",
    cartItem.variant.product.name.length > 0,
  );
  // 14. Validate product category ID format
  TestValidator.equals(
    "product category ID format",
    cartItem.variant.product.category.id,
    cartItem.variant.product.category.id,
  );
  // 15. Validate product seller ID format
  TestValidator.equals(
    "product seller ID format",
    cartItem.variant.product.seller.id,
    cartItem.variant.product.seller.id,
  );
  // 16. Validate cart references correct customer
  TestValidator.equals(
    "cart customer ID matches authenticated customer",
    cartItem.cart.customerId,
    customerAuth.id,
  );
  // 17. Validate cart ID format
  TestValidator.equals("cart item ID format", cartItem.id, cartItem.id);
  // 18. Validate timestamps are date-time format
  TestValidator.predicate(
    "cart item createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(cartItem.createdAt),
  );
  TestValidator.predicate(
    "cart item updatedAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(cartItem.updatedAt),
  );
  // 19. Validate cart item is active (not deleted)
  TestValidator.equals(
    "cart item deletedAt is null (active)",
    cartItem.deletedAt,
    null,
  );
}
