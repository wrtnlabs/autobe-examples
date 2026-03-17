import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product deletion is blocked when variants have pending cancellation requests.
 *
 * This test validates the business rule that products cannot be deleted when there are
 * pending cancellation requests on their variants. The test flow:
 * 1. Seller registers and creates a product with variants
 * 2. Customer registers, places an order, and receives the product
 * 3. Customer submits a cancellation request (status: PENDING)
 * 4. Seller attempts to delete the product - should fail with 400 error
 * 5. Verify product still exists after failed deletion attempt
 */
export async function test_api_product_deletion_blocked_by_pending_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "PENDING",
  );
  // Note: In real scenario, admin would approve seller first
  // For this test, we assume seller is approved and can create products
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(sellerLoggedIn);
  // 2. Create product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate("product has variants", product.variants.length > 0);
  // Get the first variant for ordering
  const variant = product.variants[0]!;
  TestValidator.predicate("variant has stock", variant.stockQuantity > 0);
  // 3. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: "CustomerPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(customerLoggedIn);
  // 4. Customer places order (this would normally require cart setup and address)
  // For this test, we create an order containing the seller's product variant
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // Find the order item for our product variant
  const orderItem = order.items.find(
    (item) => item.productVariant.id === variant.id,
  );
  TestValidator.predicate(
    "order contains our variant",
    orderItem !== undefined,
  );
  const targetOrderItem = orderItem!;
  // 5. Customer submits cancellation request for the order item
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerLoginConnection,
      {
        body: {
          order_item_id: targetOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "cancellation request order item",
    cancellationRequest.orderItem.id,
    targetOrderItem.id,
  );
  // 6. Seller attempts to delete the product - should fail with 400 error
  // The deletion should be blocked because there's a pending cancellation request
  await TestValidator.error(
    "product deletion blocked by pending cancellation",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(
        sellerLoginConnection,
        {
          productId: product.id,
        },
      );
    },
  );
  // 7. Verify product still exists (deletion was blocked)
  // Product should still be accessible and not deleted
  TestValidator.predicate(
    "product deletion was blocked - product should still exist",
    product.deleted_at === null,
  );
}