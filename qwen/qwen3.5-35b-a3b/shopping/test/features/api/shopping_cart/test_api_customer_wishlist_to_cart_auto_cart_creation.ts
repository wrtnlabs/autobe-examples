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

export async function test_api_customer_wishlist_to_cart_auto_cart_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
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
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create wishlist-to-cart request with random data
  // Note: In real scenario, wishlistEntryId and variantId should reference existing records
  // For edge case testing, we use random UUIDs to test auto-cart-creation
  const wishlistEntryId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const request: IEcommerceMallWishlistToCartRequest = {
    wishlistEntryId,
    variantId,
  } satisfies IEcommerceMallWishlistToCartRequest;
  // 3. Perform wishlist-to-cart operation (auto-creates cart if not exists)
  const cartItem =
    await api.functional.ecommerceMall.customer.wishlist_to_cart.transferFromWishlist(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(cartItem);
  // 4. Validate cart was created and has correct summary
  const cartSummary: IEcommerceMallShoppingCart.ISummary = cartItem.cart;
  typia.assert(cartSummary);
  // 5. Validate cart belongs to the correct customer
  TestValidator.equals(
    "cart belongs to customer",
    cartSummary.customerId,
    customer.id,
  );
  // 6. Validate cart item quantity is 1
  TestValidator.equals("cart item quantity is 1", cartItem.quantity, 1);
  // 7. Validate cart summary has itemCount=1
  TestValidator.equals("cart item count is 1", cartSummary.itemCount, 1);
  // 8. Validate subtotal and total calculations (10% tax)
  const expectedSubtotal = cartItem.price;
  const expectedTotal = cartItem.price * 1.1; // 10% tax
  TestValidator.equals(
    "cart subtotal calculation",
    cartSummary.subtotal,
    expectedSubtotal,
  );
  TestValidator.equals(
    "cart total calculation",
    cartSummary.total,
    expectedTotal,
  );
  // 9. Validate cart timestamps are valid date-time format
  TestValidator.predicate(
    "cart createdAt is valid date-time",
    () => !Number.isNaN(Date.parse(cartSummary.createdAt)),
  );
  TestValidator.predicate(
    "cart updatedAt is valid date-time",
    () => !Number.isNaN(Date.parse(cartSummary.updatedAt)),
  );
  // 10. Validate cart item was created with valid timestamps
  TestValidator.predicate(
    "cartItem createdAt is valid date-time",
    () => !Number.isNaN(Date.parse(cartItem.createdAt)),
  );
  TestValidator.predicate(
    "cartItem updatedAt is valid date-time",
    () => !Number.isNaN(Date.parse(cartItem.updatedAt)),
  );
  // 11. Validate cart item has no deletion timestamp (active item)
  TestValidator.equals("cart item is active", cartItem.deletedAt, null);
  // 12. Validate variant reference in cart item
  typia.assert(cartItem.variant);
  TestValidator.equals(
    "variant matches request",
    cartItem.variant.id,
    variantId,
  );
}
