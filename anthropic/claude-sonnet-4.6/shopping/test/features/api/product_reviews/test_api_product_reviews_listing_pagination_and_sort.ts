import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import type { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_products_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_products_reviews_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_orders_shipments_items_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_item } from "../../../prepare/prepare_random_shopping_mall_shipment_item";

export async function test_api_product_reviews_listing_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Admin Setup ───────────────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphaNumeric(10) } },
  );
  typia.assert(category);
  // ─── 2. Seller Setup ──────────────────────────────────────────────────────
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  await api.functional.shoppingMall.admin.sellerApprovals.update(
    adminConnection,
    {
      approvalId: approval.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSellerApproval.IUpdate,
    },
  );
  // ─── 3. Product + Variant + Inventory ────────────────────────────────────
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 10000,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "red",
              sequence: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(variant);
  // Add enough inventory for 3 orders
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity: 10, note: "Initial stock" },
    },
  );
  // ─── Helper: place order + create shipment ────────────────────────────────
  const placeOrderAndShip = async (
    customerConn: api.IConnection,
  ): Promise<string> => {
    const order = await generate_random_shopping_mall_customer_orders_create(
      customerConn,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          shipping_address_line1: "123 Test St",
          shipping_address_line2: null,
          shipping_city: "Seoul",
          shipping_state: null,
          shipping_postal_code: "12345",
          shipping_country: "KR",
          items: [{ product_variant_id: variant.id, quantity: 1 }],
        },
      },
    );
    typia.assert(order);
    const orderItemId = order.items[0]!.id;
    const shipment =
      await generate_random_shopping_mall_seller_orders_shipments_create(
        sellerConnection,
        {
          params: { orderId: order.id },
          body: {
            carrier: "TestCarrier",
            trackingNumber: RandomGenerator.alphaNumeric(10),
            orderItemIds: [orderItemId],
            shippedAt: new Date().toISOString(),
            estimatedDeliveryAt: new Date().toISOString(),
          },
        },
      );
    typia.assert(shipment);
    return orderItemId;
  };
  // ─── 4. Customer 1: 5-star review with keyword ───────────────────────────
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {});
  const orderItemId1 = await placeOrderAndShip(customer1Connection);
  const review1 =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customer1Connection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItemId1,
          rating: 5,
          body: "excellent product, very satisfied",
        },
      },
    );
  typia.assert(review1);
  // ─── 5. Customer 2: 3-star review ────────────────────────────────────────
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {});
  const orderItemId2 = await placeOrderAndShip(customer2Connection);
  const review2 =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customer2Connection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItemId2,
          rating: 3,
          body: "It is an average product",
        },
      },
    );
  typia.assert(review2);
  // ─── 6. Customer 3: 1-star review ────────────────────────────────────────
  const customer3Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer3Connection, {});
  const orderItemId3 = await placeOrderAndShip(customer3Connection);
  const review3 =
    await generate_random_shopping_mall_customer_products_reviews_create(
      customer3Connection,
      {
        params: { productId: product.id },
        body: {
          order_item_id: orderItemId3,
          rating: 1,
          body: "Terrible product, not recommended",
        },
      },
    );
  typia.assert(review3);
  // ─── 7. Public listing (no auth) ─────────────────────────────────────────
  const publicConnection: api.IConnection = { host: connection.host };
  // ─── Test 1: Pagination page=1, limit=2 ──────────────────────────────────
  const page1 = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId: product.id,
      body: { page: 1, limit: 2 } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page1 records", page1.pagination.records, 3);
  TestValidator.equals("page1 pages", page1.pagination.pages, 2);
  TestValidator.equals("page1 current", page1.pagination.current, 1);
  TestValidator.equals("page1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page1 data length", page1.data.length, 2);
  // ─── Test 2: Pagination page=2, limit=2 ──────────────────────────────────
  const page2 = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId: product.id,
      body: { page: 2, limit: 2 } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page2 current", page2.pagination.current, 2);
  TestValidator.equals("page2 records", page2.pagination.records, 3);
  TestValidator.equals("page2 pages", page2.pagination.pages, 2);
  TestValidator.equals("page2 data length", page2.data.length, 1);
  // ─── Test 3: Sort by rating ASC ──────────────────────────────────────────
  const sortedAsc = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId: product.id,
      body: {
        sortBy: "rating",
        sortOrder: "asc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(sortedAsc);
  TestValidator.equals("asc count", sortedAsc.data.length, 3);
  TestValidator.predicate(
    "asc rating[0] <= rating[1]",
    sortedAsc.data[0]!.rating <= sortedAsc.data[1]!.rating,
  );
  TestValidator.predicate(
    "asc rating[1] <= rating[2]",
    sortedAsc.data[1]!.rating <= sortedAsc.data[2]!.rating,
  );
  TestValidator.equals("asc first rating is 1", sortedAsc.data[0]!.rating, 1);
  TestValidator.equals("asc last rating is 5", sortedAsc.data[2]!.rating, 5);
  // ─── Test 4: Sort by rating DESC ─────────────────────────────────────────
  const sortedDesc = await api.functional.shoppingMall.products.reviews.index(
    publicConnection,
    {
      productId: product.id,
      body: {
        sortBy: "rating",
        sortOrder: "desc",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(sortedDesc);
  TestValidator.equals("desc count", sortedDesc.data.length, 3);
  TestValidator.predicate(
    "desc rating[0] >= rating[1]",
    sortedDesc.data[0]!.rating >= sortedDesc.data[1]!.rating,
  );
  TestValidator.predicate(
    "desc rating[1] >= rating[2]",
    sortedDesc.data[1]!.rating >= sortedDesc.data[2]!.rating,
  );
  TestValidator.equals("desc first rating is 5", sortedDesc.data[0]!.rating, 5);
  TestValidator.equals("desc last rating is 1", sortedDesc.data[2]!.rating, 1);
  // ─── Test 5: Body keyword filter ─────────────────────────────────────────
  const keywordResult =
    await api.functional.shoppingMall.products.reviews.index(publicConnection, {
      productId: product.id,
      body: { body: "excellent" } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(keywordResult);
  TestValidator.equals("keyword records", keywordResult.pagination.records, 1);
  TestValidator.equals("keyword data length", keywordResult.data.length, 1);
  TestValidator.predicate(
    "keyword review body contains 'excellent'",
    (keywordResult.data[0]!.body ?? "").includes("excellent"),
  );
}
