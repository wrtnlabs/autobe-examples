import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test customer order history listing with pagination.
 *
 * This test verifies the customer order history endpoint with pagination support.
 * It creates multiple orders and validates that:
 * - Orders are returned sorted by newest first (ordered_at DESC)
 * - Pagination metadata is correct (current page, total records, total pages)
 * - Each order summary includes all required fields
 * - Computed fields (total_amount, order_items_count) match actual data
 * - Pagination returns correct records for each page
 */
export async function test_api_customer_order_history_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup - join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      { body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate },
    );
  typia.assert(approvalRequest);
  // 4. Administrator approves seller
  await api.functional.shoppingMall.administrator.approval_requests.update(
    adminConnection,
    {
      requestId: approvalRequest.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 5. Seller creates product with a valid category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Seller adds inventory stock
  const inventoryRecord =
    await api.functional.shoppingMall.seller.inventory_records.create(
      sellerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity_change: 1000,
          reason: "restock",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 8. Customer setup - join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 9. Customer creates shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode:
          RandomGenerator.alphabets(5).toUpperCase() +
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<999>
          >(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 10. Create multiple orders (15 orders to test pagination with limit 10)
  const orders: IShoppingMallOrder[] = [];
  for (let i = 0; i < 15; i++) {
    // Add item to cart
    const cartItem =
      await api.functional.shoppingMall.customer.cart.items.create(
        customerConnection,
        {
          body: {
            shopping_mall_product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies IShoppingMallCartItem.ICreate,
        },
      );
    typia.assert(cartItem);
    // Create order
    const order = await api.functional.shoppingMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shopping_mall_address_id: address.id,
        } satisfies IShoppingMallOrder.ICreate,
      },
    );
    typia.assert(order);
    orders.push(order);
    // Small delay to ensure different ordered_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 11. Retrieve order list - page 1, limit 10
  const page1Result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "ordered_at",
        direction: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1Result.pagination.records,
    15,
  );
  TestValidator.equals("page 1 total pages", page1Result.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Result.data.length, 10);
  // 12. Retrieve order list - page 2, limit 10
  const page2Result = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 2,
        limit: 10,
        sort: "ordered_at",
        direction: "desc",
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2Result.pagination.records,
    15,
  );
  TestValidator.equals("page 2 total pages", page2Result.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Result.data.length, 5);
  // 13. Verify orders are sorted by ordered_at DESC (newest first)
  for (let i = 0; i < page1Result.data.length - 1; i++) {
    const currentOrder = page1Result.data[i];
    const nextOrder = page1Result.data[i + 1];
    TestValidator.predicate(
      `order ${i} should be newer than order ${i + 1}`,
      () =>
        new Date(currentOrder.ordered_at).getTime() >=
        new Date(nextOrder.ordered_at).getTime(),
    );
  }
  // 14. Verify each order summary has required fields
  for (const orderSummary of page1Result.data) {
    TestValidator.predicate(
      "order has id",
      () => orderSummary.id !== undefined,
    );
    TestValidator.predicate(
      "order has order_number",
      () => orderSummary.order_number !== undefined,
    );
    TestValidator.predicate(
      "order has ordered_at",
      () => orderSummary.ordered_at !== undefined,
    );
    TestValidator.predicate(
      "order has customer",
      () => orderSummary.customer !== undefined,
    );
    TestValidator.predicate(
      "order has recipient_name",
      () => orderSummary.recipient_name !== undefined,
    );
    TestValidator.predicate(
      "order has order_items_count",
      () => orderSummary.order_items_count !== undefined,
    );
    TestValidator.predicate(
      "order has total_amount",
      () => orderSummary.total_amount !== undefined,
    );
    TestValidator.predicate(
      "order has status",
      () => orderSummary.status !== undefined,
    );
    // Verify status is valid enum value
    TestValidator.predicate("order status is valid", () =>
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        orderSummary.status,
      ),
    );
    // Verify customer email matches authenticated customer
    TestValidator.equals(
      "customer email matches",
      orderSummary.customer.email,
      customerAuth.email,
    );
  }
  // 15. Verify total_amount and order_items_count match actual order data
  for (const orderSummary of page1Result.data) {
    // Find the corresponding full order
    const fullOrder = orders.find((o) => o.id === orderSummary.id);
    if (fullOrder) {
      TestValidator.equals(
        `order_items_count matches for ${orderSummary.order_number}`,
        orderSummary.order_items_count,
        fullOrder.orderItems.length,
      );
      const calculatedTotal = fullOrder.orderItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      TestValidator.equals(
        `total_amount matches for ${orderSummary.order_number}`,
        orderSummary.total_amount,
        calculatedTotal,
      );
    }
  }
  // 16. Verify no overlap between page 1 and page 2
  const page1Ids = new Set(page1Result.data.map((o) => o.id));
  const page2Ids = new Set(page2Result.data.map((o) => o.id));
  for (const id of page2Ids) {
    TestValidator.predicate(
      `order ${id} should not appear in both pages`,
      () => !page1Ids.has(id),
    );
  }
  // 17. Verify all 15 orders are accounted for
  TestValidator.equals(
    "total orders across pages",
    page1Result.data.length + page2Result.data.length,
    15,
  );
}
