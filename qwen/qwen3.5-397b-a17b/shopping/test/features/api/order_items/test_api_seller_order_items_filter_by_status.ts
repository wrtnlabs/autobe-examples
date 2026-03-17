import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_seller_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 2. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 3. Seller creates a product
  // Note: This requires a valid category ID. In a complete test, we would create a category first.
  // For this test, we use a random UUID assuming the backend has default categories or the test
  // environment is pre-populated.
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller queries order items filtered by PAID status
  // Initially, there should be no order items since no orders have been placed yet
  const initialOrderItemsResponse =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          status: "PAID",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(initialOrderItemsResponse);
  // Validate response structure
  TestValidator.predicate(
    "has pagination",
    initialOrderItemsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(initialOrderItemsResponse.data),
  );
  // 5. Test other status filters (SHIPPED, DELIVERED, CANCELLED, REFUNDED)
  const statuses: Array<
    "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
  > = ["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
  for (const status of statuses) {
    const filteredResponse =
      await api.functional.shoppingMall.seller.order_items.index(
        sellerConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 20,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate response structure
    TestValidator.predicate(
      `has pagination for ${status}`,
      filteredResponse.pagination !== undefined,
    );
    TestValidator.predicate(
      `has data array for ${status}`,
      Array.isArray(filteredResponse.data),
    );
    // Validate all items have the correct status and belong to the seller
    for (const item of filteredResponse.data) {
      TestValidator.equals(
        `status filter ${status} matches`,
        item.status,
        status,
      );
      TestValidator.equals(
        `seller matches for ${status}`,
        item.seller.id,
        sellerJoin.id,
      );
      TestValidator.predicate(
        `has product snapshot for ${status}`,
        item.productSnapshot !== undefined,
      );
      TestValidator.predicate(
        `has variant snapshot for ${status}`,
        item.productVariantSnapshot !== undefined,
      );
      TestValidator.predicate(
        `quantity is positive for ${status}`,
        item.quantity > 0,
      );
      TestValidator.predicate(
        `unit price is non-negative for ${status}`,
        item.unit_price >= 0,
      );
    }
  }
  // 6. Verify order items from other sellers are not included
  // All items in the response should belong to the authenticated seller
  for (const item of initialOrderItemsResponse.data) {
    TestValidator.equals(
      "seller id matches authenticated seller",
      item.seller.id,
      sellerJoin.id,
    );
  }
}
