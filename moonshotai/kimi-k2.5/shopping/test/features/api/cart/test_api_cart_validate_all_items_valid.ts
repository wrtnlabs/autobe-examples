import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_cart_validate_all_items_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Add a product variant to the cart with valid quantity
  const cartItem = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 3. Validate the cart
  const validationResult =
    await api.functional.ecommerceMall.customer.cart.validate(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCartItem.IValidate,
      },
    );
  typia.assert(validationResult);
  // 4. Verify validation results - business logic assertions
  TestValidator.predicate("cart is valid", validationResult.isValid === true);
  TestValidator.predicate("has cart items", validationResult.items.length > 0);
  // Verify the cart item we created is in the validation results
  const validatedItem = validationResult.items.find(
    (item) => item.id === cartItem.id,
  );
  TestValidator.predicate(
    "cart item exists in validation results",
    validatedItem !== undefined,
  );
  if (validatedItem) {
    TestValidator.predicate("item is valid", validatedItem.isValid === true);
    TestValidator.predicate(
      "item is available",
      validatedItem.isAvailable === true,
    );
    TestValidator.equals("item has no warning", validatedItem.warning, null);
    TestValidator.predicate(
      "item available quantity is sufficient",
      validatedItem.availableQuantity >= validatedItem.quantity,
    );
  }
  // Verify all items are valid
  for (const item of validationResult.items) {
    TestValidator.predicate(`item ${item.id} is valid`, item.isValid === true);
    TestValidator.predicate(
      `item ${item.id} is available`,
      item.isAvailable === true,
    );
    TestValidator.equals(`item ${item.id} has no warning`, item.warning, null);
  }
  // Verify total price calculation matches sum of subtotals
  const expectedTotal = validationResult.items.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );
  TestValidator.equals(
    "total price matches sum of subtotals",
    validationResult.totalPrice,
    expectedTotal,
  );
}
