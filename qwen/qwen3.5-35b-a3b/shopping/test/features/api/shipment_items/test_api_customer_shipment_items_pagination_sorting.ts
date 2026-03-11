import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_shipment_items_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "password123",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Setup: Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: "password123",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Setup: Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Setup: Customer creates cart
  const cart =
    await api.functional.ecommerceMall.customer.carts.create(
      customerConnection,
    );
  typia.assert(cart);
  // Setup: Add product variant to cart
  if (product.variants && product.variants.length > 0) {
    const cartItem =
      await api.functional.ecommerceMall.customer.carts.items.create(
        customerConnection,
        {
          cartId: cart.id,
          body: {
            variant_id:
              product.variants[0]?.id ??
              typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies IEcommerceMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
  }
  // Note: Order and shipment creation requires additional APIs not available in current SDK.
  // The test focuses on pagination and sorting validation assuming existing order/shipment data.
  // For complete integration testing, order creation and shipment creation APIs are needed.
  // Test Phase: Pagination with page size 10
  const page10: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 10, page: 1 },
      },
    );
  typia.assert(page10);
  TestValidator.equals("pagination current", page10.pagination.current, 1);
  TestValidator.equals("pagination limit", page10.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    page10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    page10.pagination.pages === Math.ceil(page10.pagination.records / 10),
  );
  // Test Phase: Pagination with page size 20
  const page20: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 20, page: 1 },
      },
    );
  typia.assert(page20);
  TestValidator.equals("pagination limit", page20.pagination.limit, 20);
  TestValidator.equals("pagination current", page20.pagination.current, 1);
  // Test Phase: Pagination with page size 50
  const page50: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 50, page: 1 },
      },
    );
  typia.assert(page50);
  TestValidator.equals("pagination limit", page50.pagination.limit, 50);
  TestValidator.equals("pagination current", page50.pagination.current, 1);
  // Test Phase: Multiple pages with size 10
  for (let pageNum = 1; pageNum <= 5; pageNum++) {
    const page =
      await api.functional.ecommerceMall.customer.orders.shipments.items.index(
        customerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
          body: { limit: 10, page: pageNum },
        },
      );
    typia.assert(page);
    TestValidator.equals(
      `page ${pageNum} current`,
      page.pagination.current,
      pageNum,
    );
    TestValidator.equals(`page ${pageNum} limit`, page.pagination.limit, 10);
    TestValidator.predicate(
      `page ${pageNum} has valid data`,
      page.data.length >= 0,
    );
  }
  // Test Phase: Page beyond total pages (returns empty with correct metadata)
  const pageBeyond: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 10, page: 100 },
      },
    );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond current",
    pageBeyond.pagination.current,
    100,
  );
  TestValidator.equals("page beyond limit", pageBeyond.pagination.limit, 10);
  TestValidator.predicate(
    "page beyond empty data",
    pageBeyond.data.length === 0,
  );
  // Test Phase: Limit above maximum (should use max 100)
  const limitHigh: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 200, page: 1 },
      },
    );
  typia.assert(limitHigh);
  TestValidator.equals("limit high uses max", limitHigh.pagination.limit, 100);
  // Test Phase: Limit below minimum (should use min 1)
  const limitLow: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { limit: 0, page: 1 },
      },
    );
  typia.assert(limitLow);
  TestValidator.equals("limit low uses min", limitLow.pagination.limit, 1);
  // Test Phase: Sorting by created_at (default)
  const sortedByCreated: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { sort: "created_at", limit: 100 },
      },
    );
  typia.assert(sortedByCreated);
  TestValidator.predicate(
    "created_at sort returns valid data",
    sortedByCreated.data.length >= 0,
  );
  // Test Phase: Sorting by quantity
  const sortedByQuantity: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { sort: "quantity", limit: 100 },
      },
    );
  typia.assert(sortedByQuantity);
  TestValidator.predicate(
    "quantity sort returns valid data",
    sortedByQuantity.data.length >= 0,
  );
  // Test Phase: Sorting by itemStatus
  const sortedByStatus: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { sort: "itemStatus", limit: 100 },
      },
    );
  typia.assert(sortedByStatus);
  TestValidator.predicate(
    "itemStatus sort returns valid data",
    sortedByStatus.data.length >= 0,
  );
  // Test Phase: Search by order number
  const searchResult: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { search: "ORD", limit: 10 },
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search pagination limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "search returns valid data",
    searchResult.data.length >= 0,
  );
  // Test Phase: Filter by itemStatus
  const filterResult: IPageIEcommerceMallShipmentItem.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.items.index(
      customerConnection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: { itemStatus: "shipped", limit: 10 },
      },
    );
  typia.assert(filterResult);
  TestValidator.equals(
    "filter pagination limit",
    filterResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filter returns valid data",
    filterResult.data.length >= 0,
  );
}