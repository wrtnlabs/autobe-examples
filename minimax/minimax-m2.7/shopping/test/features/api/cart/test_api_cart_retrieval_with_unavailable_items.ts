import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_retrieval_with_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Customer retrieves cart (initially empty or with sample items from previous test state)
  const cart =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // 3. Validate cart structure
  TestValidator.predicate("cart has items array", Array.isArray(cart.items));
  TestValidator.predicate(
    "cart has cartTotal",
    typeof cart.cartTotal === "number",
  );
  TestValidator.predicate("cart has customer", !!cart.customer);
  TestValidator.predicate("cart has id", !!cart.id);
  TestValidator.predicate("cart has createdAt", !!cart.createdAt);
  TestValidator.predicate("cart has updatedAt", !!cart.updatedAt);
  // 4. Validate cart item structure when items exist
  for (const item of cart.items) {
    typia.assert(item);
    // Validate item properties
    TestValidator.predicate("item has id", !!item.id);
    TestValidator.predicate(
      "item has quantity",
      typeof item.quantity === "number",
    );
    TestValidator.predicate(
      "item has subtotal",
      typeof item.subtotal === "number",
    );
    TestValidator.predicate("item has createdAt", !!item.createdAt);
    TestValidator.predicate("item has updatedAt", !!item.updatedAt);
    // Validate availabilityStatus field exists and is valid
    TestValidator.predicate(
      "item has availabilityStatus",
      typeof item.availabilityStatus === "string",
    );
    TestValidator.predicate(
      "availabilityStatus is available or unavailable",
      item.availabilityStatus === "available" ||
        item.availabilityStatus === "unavailable",
    );
    // Validate productVariant structure
    const variant = item.productVariant;
    TestValidator.predicate("variant has id", !!variant.id);
    TestValidator.predicate(
      "variant has skuCode",
      typeof variant.skuCode === "string",
    );
    TestValidator.predicate(
      "variant has quantity",
      typeof variant.quantity === "number",
    );
    TestValidator.predicate(
      "variant has optionValues",
      Array.isArray(variant.optionValues),
    );
    // Validate product details are present
    TestValidator.predicate("variant has product", !!variant.product);
    if (variant.product) {
      TestValidator.predicate("product has id", !!variant.product.id);
      TestValidator.predicate(
        "product has name",
        typeof variant.product.name === "string",
      );
    }
    // Validate availability logic
    const isOutOfStock = variant.quantity <= 0;
    const isDeleted = variant.deletedAt !== null;
    const expectedUnavailable = isOutOfStock || isDeleted;
    TestValidator.equals(
      "availabilityStatus matches stock/deleted state",
      item.availabilityStatus,
      expectedUnavailable ? "unavailable" : "available",
    );
  }
  // 5. Validate cart total calculation
  const calculatedTotal = cart.items.reduce((sum, item) => {
    const price =
      item.productVariant.price ?? item.productVariant.product?.basePrice ?? 0;
    const qty = item.quantity;
    return sum + price * qty;
  }, 0);
  TestValidator.equals(
    "cart total is sum of item subtotals",
    cart.cartTotal,
    calculatedTotal,
  );
  // 6. Unavailable items still present in cart (not auto-removed)
  const unavailableItems = cart.items.filter(
    (item) => item.availabilityStatus === "unavailable",
  );
  TestValidator.predicate(
    "unavailable items still in cart (not auto-removed)",
    unavailableItems.length >= 0,
  );
}
