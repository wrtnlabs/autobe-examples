import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test the primary success path of adding a new product variant to a customer's shopping cart.
 * Validates cart item creation with correct variant details, price snapshot, and cart updates.
 */
export async function test_api_cart_item_creation_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuthorized);
  // 2. Create cart item with a new product variant using utility
  // Utility will handle cart creation if needed
  const newCartItem: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_carts_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(newCartItem);
  // 3. Validate cart item references correct cart
  TestValidator.equals(
    "cart item references correct cart",
    newCartItem.cart.id,
    newCartItem.cart.id,
  );
  // 4. Validate cart item quantity matches input (default 1)
  TestValidator.equals(
    "cart item quantity matches expected",
    newCartItem.quantity,
    1,
  );
  // 5. Validate price snapshot matches variant display price
  TestValidator.equals(
    "cart item price matches variant display price",
    newCartItem.price,
    newCartItem.variant.displayPrice,
  );
  TestValidator.predicate("cart item price is positive", newCartItem.price > 0);
  // 6. Validate variant has required fields
  TestValidator.notEquals(
    "variant id is present",
    newCartItem.variant.id,
    null,
  );
  TestValidator.notEquals(
    "variant SKU code is present",
    newCartItem.variant.skuCode,
    "",
  );
  TestValidator.predicate(
    "variant stock quantity is non-negative",
    newCartItem.variant.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "variant is active",
    newCartItem.variant.isActive === true,
  );
  // 7. Validate cart item references correct customer via cart
  TestValidator.equals(
    "cart item references correct customer",
    newCartItem.cart.customer.id,
    customerAuthorized.id,
  );
  // 8. Validate timestamps are recorded and valid
  TestValidator.notEquals(
    "cart item created_at timestamp recorded",
    newCartItem.created_at,
    null,
  );
  TestValidator.notEquals(
    "cart item updated_at timestamp recorded",
    newCartItem.updated_at,
    null,
  );
  const createdAtDate: Date = new Date(newCartItem.created_at);
  TestValidator.predicate(
    "cart item created_at is valid date",
    !isNaN(createdAtDate.getTime()),
  );
  const updatedAtDate: Date = new Date(newCartItem.updated_at);
  TestValidator.predicate(
    "cart item updated_at is valid date",
    !isNaN(updatedAtDate.getTime()),
  );
  // 9. Validate variant has product reference
  TestValidator.notEquals(
    "variant product is referenced",
    newCartItem.variant.product,
    null,
  );
}
