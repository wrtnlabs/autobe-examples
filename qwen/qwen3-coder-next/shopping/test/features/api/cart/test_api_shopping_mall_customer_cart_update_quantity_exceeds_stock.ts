import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shopping_mall_customer_cart_update_quantity_exceeds_stock(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authorize customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerToken = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerToken);
  const updatedCustomerConnection: api.IConnection = { host: connection.host };
  updatedCustomerConnection.headers = {
    Authorization: `Bearer ${customerToken.token.access}`,
  };
  // Step 2: Create product with limited stock (e.g., 5 units)
  // TODO: Replace with correct product creation path
  const productResponse: any = {
    id: "product-123",
    name: "Test Product",
    price: 10000,
    stock: 5,
  };
  // Step 3: Add product to cart
  // TODO: Replace with correct cart creation path
  const cartItem: any = {
    id: "cart-456",
    product_id: productResponse.id,
    quantity: 2,
  };
  // Step 4: Attempt to update quantity exceeding available stock
  const availableStock = 5 - 2; // Remaining stock after initial cart addition
  const quantityExceedingStock = availableStock + 1; // Exceeds available by 1
  await TestValidator.error("quantity exceeds stock", async () => {
    await api.functional.shoppingMall.customer.carts.putByCartid(
      updatedCustomerConnection,
      {
        cartId: cartItem.id,
        body: {
          quantity: quantityExceedingStock,
        },
      },
    );
  });
}