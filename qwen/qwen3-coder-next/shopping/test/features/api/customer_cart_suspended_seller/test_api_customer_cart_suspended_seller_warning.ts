import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCartValidationWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartValidationWarning";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_cart_suspended_seller_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuthorized);
  // 2. Create product with variant (using mock pre-existing product data)
  //    Since product creation API not fully available, use mock product data
  const mockProduct = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    seller_is_suspended: true, // Pre-suspended seller
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies any; // Using any due to limited DTO definitions
  const mockVariant = {
    id: typia.random<string & tags.Format<"uuid">>(),
    product_id: mockProduct.id,
    sku_code: RandomGenerator.alphaNumeric(10),
    price_override: mockProduct.base_price,
    stock_quantity: 10,
  } satisfies any; // Using any due to limited DTO definitions
  // 3. Add variant to customer cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: mockVariant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Retrieve customer cart (server should mark suspended seller items as unavailable)
  const cartResponse =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cartResponse);
  // 5. Verify cart item has is_available=false due to suspended seller
  const cartItemInCart = cartResponse.items.find(
    (item) => item.variant_id === mockVariant.id,
  );
  TestValidator.notEquals("cart item found", cartItemInCart, undefined);
  if (cartItemInCart === undefined) {
    throw new Error("cart item not found");
  }
  TestValidator.equals(
    "is_available is false due to suspended seller",
    cartItemInCart.is_available,
    false,
  );
  // 6. Verify seller_suspended warning exists
  const sellerSuspendedWarning = cartResponse.validation_warnings.find(
    (w) => w.warningType === "seller_suspended",
  );
  TestValidator.equals(
    "seller_suspended warning found",
    sellerSuspendedWarning !== undefined,
    true,
  );
  if (sellerSuspendedWarning) {
    TestValidator.equals(
      "warning has affectedFields",
      sellerSuspendedWarning.affectedFields.includes("variant_id"),
      true,
    );
    TestValidator.predicate(
      "warning message contains seller",
      sellerSuspendedWarning.message.includes("suspended"),
    );
  }
  // 7. Verify subtotal and total_amount are still calculated despite unavailability
  if (cartItemInCart !== undefined) {
    TestValidator.predicate(
      "subtotal > 0 for suspended item",
      cartItemInCart.subtotal > 0,
    );
  }
  TestValidator.predicate(
    "total_amount > 0 despite suspended items",
    cartResponse.total_amount > 0,
  );
}