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

export async function test_api_cart_item_quantity_merge(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and get authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Generate a product variant to add to cart
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial cart item with quantity 2 to get cartId
  const initialQuantity = 2;
  const firstItem =
    await api.functional.ecommerceMall.customer.carts.cartItems.create(
      customerConnection,
      {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          variant_id: variantId,
          quantity: initialQuantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstItem);
  const cartId = firstItem.cart.id;
  const initialCreatedAt = firstItem.created_at;
  const initialPrice = firstItem.price;
  const variant = typia.assert<IEcommerceMallProductVariant>(firstItem.variant);
  // 4. Add same variant with quantity 3 (should merge to total 5)
  const additionalQuantity = 3;
  await api.functional.ecommerceMall.customer.carts.cartItems.create(
    customerConnection,
    {
      cartId,
      body: {
        variant_id: variant.id,
        quantity: additionalQuantity,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 5. Retrieve all cart items and verify merge
  const mergedItemsResponse =
    await api.functional.ecommerceMall.customer.carts.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          cartId,
        } satisfies IEcommerceMallCartItem.IRequest,
      },
    );
  typia.assert(mergedItemsResponse);
  // Find the cart item for this variant
  const mergedCartItem = mergedItemsResponse.data.find(
    (item) => item.variant.id === variant.id,
  );
  TestValidator.predicate(
    "cart item exists for variant",
    mergedCartItem !== undefined,
  );
  const mergedSummary = typia.assert<IEcommerceMallCartItem.ISummary>(
    mergedCartItem!,
  );
  // 6. Validate quantity merge (2 + 3 = 5)
  const expectedQuantity = initialQuantity + additionalQuantity;
  TestValidator.equals(
    "quantity merged correctly",
    mergedSummary.quantity,
    expectedQuantity,
  );
  // 7. Verify only one cart item exists for this variant
  const sameVariantItems = mergedItemsResponse.data.filter(
    (item) => item.variant.id === variant.id,
  );
  TestValidator.equals(
    "only one cart item for variant",
    sameVariantItems.length,
    1,
  );
  // 8. Verify price remains original (not updated by merge)
  TestValidator.equals(
    "price preserved from initial addition",
    initialPrice,
    mergedSummary.price,
  );
}
