import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_shopping_mall_cart_merge_existing_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2. Create first cart item with variant using utility function
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const initialQuantity = 2;
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: initialQuantity,
        } satisfies IShoppingMallCart.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // 3. Add same variant again to trigger merge (increase quantity) using utility function
  const additionalQuantity = 3;
  const mergedCartItem =
    await generate_random_shopping_mall_customer_cart_create(
      customerConnection,
      {
        body: {
          variant_id: variantId,
          quantity: additionalQuantity,
        } satisfies IShoppingMallCart.ICreate,
      },
    );
  typia.assert(mergedCartItem);
  // 4. Validate merged cart item - should have combined quantity and unchanged price/snapshot
  TestValidator.equals(
    "cart item quantity equals sum",
    mergedCartItem.quantity,
    initialQuantity + additionalQuantity,
  );
  TestValidator.equals(
    "cart item price unchanged",
    mergedCartItem.price,
    firstCartItem.price,
  );
  TestValidator.equals(
    "cart item product_name unchanged",
    mergedCartItem.product_name,
    firstCartItem.product_name,
  );
  TestValidator.equals(
    "cart item sku_code unchanged",
    mergedCartItem.sku_code,
    firstCartItem.sku_code,
  );
  TestValidator.equals(
    "cart item image_url unchanged",
    mergedCartItem.image_url,
    firstCartItem.image_url,
  );
  TestValidator.equals(
    "cart item option_values unchanged",
    mergedCartItem.option_values,
    firstCartItem.option_values,
  );
  TestValidator.equals(
    "cart item subtotal updated",
    mergedCartItem.subtotal,
    mergedCartItem.price * mergedCartItem.quantity,
  );
  // 5. Validate in_stock is still accurate (must be true for this scenario to work)
  TestValidator.predicate(
    "cart item in_stock is true",
    mergedCartItem.in_stock,
  );
}
