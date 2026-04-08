import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IMallPlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Review the authenticated customer's current shopping cart for purchase readiness.
 *
 * 1. Registers a fresh customer session and loads the active shopping cart using that authenticated connection.
 * 2. Verifies the cart is scoped to the authenticated customer and that the returned owner summary matches the session identity.
 * 3. Validates each cart item exposes the nested product and variant data needed for purchase review, including product name, seller summary, category context, variant options, and pricing data.
 * 4. Confirms the cart read is stable and non-mutating by fetching the cart twice and comparing the results.
 *
 * The test also checks that cart lines are represented without duplicate variant identifiers in the returned payload, which is the strongest read-only signal available for the combined-line behavior under the provided API surface.
 */
export async function test_api_shopping_cart_current_cart_review(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const cart =
    await api.functional.mallPlatform.customer.shopping_carts.at(
      customerConnection,
    );
  typia.assert(cart);
  TestValidator.equals(
    "cart owner id should match the authenticated customer",
    cart.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "cart owner email should match the authenticated customer",
    cart.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "cart owner status should match the authenticated customer",
    cart.customer.status,
    authorized.status,
  );
  TestValidator.equals(
    "cart owner created_at should match the authenticated customer",
    cart.customer.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "cart owner updated_at should match the authenticated customer",
    cart.customer.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "cart owner deleted_at should match the authenticated customer",
    cart.customer.deleted_at,
    authorized.deleted_at,
  );
  TestValidator.predicate("cart should have an id", cart.id.length > 0);
  TestValidator.equals(
    "cart should be owned by the current customer",
    cart.customer.id,
    authorized.id,
  );
  TestValidator.predicate(
    "cart items should be an array",
    Array.isArray(cart.cartItems),
  );
  const calculatedTotal = cart.cartItems.reduce((sum, item) => {
    const unitPrice =
      item.productVariant.priceOverride ??
      item.productVariant.product.basePrice;
    return sum + unitPrice * item.quantity;
  }, 0);
  TestValidator.predicate(
    "derived cart total should be non-negative",
    calculatedTotal >= 0,
  );
  const uniqueVariantIds = new Set<string>();
  for (const item of cart.cartItems) {
    TestValidator.equals(
      "cart item should belong to the current cart",
      item.shoppingCart.id,
      cart.id,
    );
    TestValidator.equals(
      "cart item should belong to the current customer",
      item.shoppingCart.customer.id,
      authorized.id,
    );
    TestValidator.predicate(
      "cart item quantity should be positive",
      item.quantity > 0,
    );
    TestValidator.predicate(
      "cart item availability state should be present",
      item.availabilityState.length > 0,
    );
    TestValidator.predicate(
      "cart item variant id should be present",
      item.productVariant.id.length > 0,
    );
    TestValidator.predicate(
      "cart item product id should be present",
      item.productVariant.product.id.length > 0,
    );
    TestValidator.predicate(
      "cart item product name should be present",
      item.productVariant.product.name.length > 0,
    );
    TestValidator.predicate(
      "cart item product description should be present",
      item.productVariant.product.description.length > 0,
    );
    TestValidator.predicate(
      "cart item seller summary should be present",
      item.productVariant.product.sellerAccount.id.length > 0,
    );
    TestValidator.predicate(
      "cart item category summary may exist or be null but must be readable",
      item.productVariant.product.category === null ||
        item.productVariant.product.category.id.length > 0,
    );
    TestValidator.predicate(
      "cart item variant options should be present",
      item.productVariant.optionValues.length > 0,
    );
    TestValidator.predicate(
      "cart item unit price should be positive",
      (item.productVariant.priceOverride ??
        item.productVariant.product.basePrice) > 0,
    );
    TestValidator.predicate(
      "cart item variant ids should not repeat in the current cart payload",
      !uniqueVariantIds.has(item.productVariant.id),
    );
    uniqueVariantIds.add(item.productVariant.id);
  }
  const cartAgain =
    await api.functional.mallPlatform.customer.shopping_carts.at(
      customerConnection,
    );
  typia.assert(cartAgain);
  TestValidator.equals("cart id should remain stable", cartAgain.id, cart.id);
  TestValidator.equals(
    "cart owner should remain stable",
    cartAgain.customer.id,
    cart.customer.id,
  );
  TestValidator.equals(
    "cart items should remain stable across repeated reads",
    cartAgain.cartItems,
    cart.cartItems,
  );
}
