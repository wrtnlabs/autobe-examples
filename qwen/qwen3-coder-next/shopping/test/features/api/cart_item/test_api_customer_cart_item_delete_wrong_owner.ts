import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_shopping_cart } from "../../../prepare/prepare_random_shopping_mall_shopping_cart";

export async function test_api_customer_cart_item_delete_wrong_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two customers
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAData = await authorize_customer_join(customerAConnection, {
    body: {
      email: RandomGenerator.alphabets(5) + "@test.com",
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAData);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBData = await authorize_customer_join(customerBConnection, {
    body: {
      email: RandomGenerator.alphabets(5) + "@test.com",
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerBData);
  // 2. Get a product and variant from the system (using available public APIs or pre-seeded data)
  // Since there's no admin API available, we'll need to use a pre-seeded product
  // For this test, we'll use a fixed variant ID (assuming one exists in the test database)
  const fixedVariantId = "12345678-1234-1234-1234-123456789012";
  // 3. Customer A adds item to cart
  const cartItemA =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerAConnection,
      {
        body: {
          shopping_mall_product_variant_id: fixedVariantId,
          quantity: 1,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cartItemA);
  // 4. Customer B adds item to cart
  const cartItemB =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerBConnection,
      {
        body: {
          shopping_mall_product_variant_id: fixedVariantId,
          quantity: 1,
        } satisfies IShoppingMallShoppingCart.ICreate,
      },
    );
  typia.assert(cartItemB);
  // 5. Verify Customer A cannot delete Customer B's cart item
  await TestValidator.error(
    "Customer A cannot delete Customer B's cart item",
    async () => {
      await api.functional.shoppingMall.customer.carts.items.erase(
        customerAConnection,
        {
          cartItemId: cartItemB.id,
        },
      );
    },
  );
}
