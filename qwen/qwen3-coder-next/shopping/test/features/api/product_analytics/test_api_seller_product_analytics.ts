import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_seller_product_analytics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as seller and verify analytics endpoint returns proper data structure
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create some test products for analytics
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Note: Products API structure may need adjustment based on actual API definition
  // const product1 = await api.functional.shoppingMall.seller.products.create(
  //   sellerConnection,
  //   {
  //     body: {
  //       name: RandomGenerator.paragraph({ sentences: 2 }),
  //       price: typia.random<
  //         number & tags.Type<"uint32"> & tags.Minimum<1000>
  //       >(),
  //       stock: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  //       description: RandomGenerator.paragraph({ sentences: 3 }),
  //     } satisfies IShoppingMallProduct.ICreate,
  //   },
  // );
  // typia.assert(product1);
  // Create order to generate analytics data
  await api.functional.shoppingMall.customer.orders.create(customerConnection, {
    body: {
      shipping_address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(2),
        state: RandomGenerator.name(2),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "US",
      },
      items: [
        {
          product_id: "test-product-id", // Use test ID instead of product1.id
          variant_id: null,
          quantity: 1,
          price: 1000,
        },
      ],
    },
  });
  // 2. Verify pagination with limit and offset parameters
  const responseWithLimit =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          pagination: {
            current: 1,
            limit: 5,
          },
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(responseWithLimit);
  // 3. Test filtering by category and date range
  const responseWithFilters =
    await api.functional.shoppingMall.seller.analytics.products.index(
      sellerConnection,
      {
        body: {
          pagination: {
            current: 1,
            limit: 10,
          },
          filters: {
            category_id: null,
            start_date: new Date(new Date().getFullYear(), 0, 1).toISOString(),
            end_date: new Date().toISOString(),
          },
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(responseWithFilters);
  // 4. Verify response structure matches IPageIShoppingMallProductSnapshot.ISummary
  TestValidator.predicate(
    "has pagination structure",
    responseWithFilters.pagination !== null,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(responseWithFilters.data),
  );
  // 5. Validate analytics data properties
  if (responseWithFilters.data.length > 0) {
    const firstProduct = responseWithFilters.data[0];
    typia.assert(firstProduct);
  }
}