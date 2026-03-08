import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_view_with_available_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Customer views their cart
  const cart: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // 3. Validate cart structure
  TestValidator.predicate("cart has items array", Array.isArray(cart.items));
  TestValidator.predicate("cart total is non-negative", cart.total >= 0);
  // 4. If cart has items, validate each item structure
  if (cart.items.length > 0) {
    // Validate total matches sum of subtotals
    const calculatedTotal = cart.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    TestValidator.equals(
      "cart total matches sum of subtotals",
      cart.total,
      calculatedTotal,
    );
    // Validate each cart item
    for (const item of cart.items) {
      // Basic item fields
      TestValidator.predicate("item has valid id", item.id !== undefined);
      TestValidator.predicate("item quantity is positive", item.quantity >= 1);
      TestValidator.predicate(
        "item has is_available flag",
        typeof item.is_available === "boolean",
      );
      TestValidator.predicate(
        "item has added_at timestamp",
        item.added_at !== undefined,
      );
      TestValidator.predicate(
        "item subtotal is non-negative",
        item.subtotal >= 0,
      );
      // Validate product_variant structure
      const variant = item.product_variant;
      TestValidator.predicate("variant has valid id", variant.id !== undefined);
      TestValidator.predicate(
        "variant has sku_code",
        variant.sku_code !== undefined,
      );
      TestValidator.predicate(
        "variant has stock_quantity",
        variant.stock_quantity !== undefined,
      );
      TestValidator.predicate(
        "variant has option_values",
        typeof variant.option_values === "object",
      );
      // If item is available, variant should have stock
      if (item.is_available) {
        TestValidator.predicate(
          "available item has stock",
          variant.stock_quantity > 0,
        );
      }
    }
  }
}
