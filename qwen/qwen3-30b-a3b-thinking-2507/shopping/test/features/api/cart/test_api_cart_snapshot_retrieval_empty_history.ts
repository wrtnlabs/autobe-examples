import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartSnapshot";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_create } from "../../../generate/generate_random_shopping_mall_customer_carts_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";

export async function test_api_cart_snapshot_retrieval_empty_history(
  connection: api.IConnection,
) {
  // Authenticate and authorize customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // Create a new cart (no items yet)
  const cart: IShoppingMallCart =
    await generate_random_shopping_mall_customer_carts_create(
      customerConnection,
      {
        body: {
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        },
      },
    );
  typia.assert(cart);
  // Retrieve snapshots for this cart (expecting empty results since no changes have been made)
  const response: IPageIShoppingMallCartSnapshot =
    await api.functional.shoppingMall.customer.carts.snapshots.index(
      customerConnection,
      {
        cartId: cart.id,
        body: {} satisfies IShoppingMallCartSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // Verify snapshot response is empty (no historical modifications)
  TestValidator.equals("empty snapshot data", response.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    response.pagination.records,
    0,
  );
  TestValidator.equals("empty pagination pages", response.pagination.pages, 0);
}
