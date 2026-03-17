import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cancellation_request_snapshot_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get authenticated connection
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 2. Create seller account and get authenticated connection
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Seller creates product
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
  // 4. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: 100,
          options: [
            {
              key: "color",
              value: "Red",
            },
            {
              key: "size",
              value: "Large",
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart (need to do this twice for two orders)
  const cartItem1 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 6. Customer needs to create shipping address first (simulate with random UUID)
  // For this test, we'll use a random UUID as addressId
  const addressId = typia.random<string & tags.Format<"uuid">>();
  // 7. Customer places first order
  const order1 = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: addressId,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order1);
  // 8. Customer places second order (add more items to cart first)
  const cartItem2 =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const order2 = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: addressId,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order2);
  // 9. Get order items from both orders for cancellation requests
  const orderItem1 = order1.items[0];
  const orderItem2 = order2.items[0];
  // 10. Customer submits first cancellation request
  const cancellationRequest1 =
    await api.functional.shoppingMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem1.id,
          reason: "Changed my mind about this item",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest1);
  // 11. Customer submits second cancellation request
  const cancellationRequest2 =
    await api.functional.shoppingMall.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem2.id,
          reason: "Found better price elsewhere",
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest2);
  // 12. Seller approves first cancellation request (creates APPROVED snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest1.id,
        body: {
          status: "APPROVED",
          responded_at: new Date().toISOString(),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 13. Seller rejects second cancellation request (creates REJECTED snapshot)
  const rejectedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest2.id,
        body: {
          status: "REJECTED",
          responded_at: new Date().toISOString(),
        } satisfies IShoppingMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 14. Customer queries snapshots with APPROVED status filter
  const approvedSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify only APPROVED snapshots are returned
  TestValidator.predicate("all snapshots should be APPROVED", () =>
    approvedSnapshots.data.every((snapshot) => snapshot.status === "APPROVED"),
  );
  TestValidator.predicate(
    "should have at least one APPROVED snapshot",
    () => approvedSnapshots.data.length >= 1,
  );
  // 15. Customer queries snapshots with REJECTED status filter
  const rejectedSnapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "REJECTED",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify only REJECTED snapshots are returned
  TestValidator.predicate("all snapshots should be REJECTED", () =>
    rejectedSnapshots.data.every((snapshot) => snapshot.status === "REJECTED"),
  );
  TestValidator.predicate(
    "should have at least one REJECTED snapshot",
    () => rejectedSnapshots.data.length >= 1,
  );
  // 16. Verify pagination works with filters
  const paginatedApproved =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status: "APPROVED",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedApproved);
  TestValidator.predicate(
    "pagination should work with limit 1",
    () => paginatedApproved.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedApproved.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedApproved.pagination.limit,
    1,
  );
}
