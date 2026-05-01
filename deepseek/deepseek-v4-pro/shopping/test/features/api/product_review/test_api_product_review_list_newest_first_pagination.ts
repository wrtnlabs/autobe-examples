import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewReview";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallReviewReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReviewSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_review_review } from "../../../prepare/prepare_random_shopping_mall_review_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test paginated review listing sorted newest first for a specific product.
 *
 * Validates that the product review listing endpoint returns reviews in correct
 * newest-first order with accurate pagination metadata. Two reviews are created
 * from separate orders with different ratings, then the listing endpoint is
 * queried with pagination to verify ordering, metadata, and reviewer identity.
 *
 * 1. Seller joins and creates a product with a variant and 100 units of stock.
 * 2. Customer joins and places two separate orders for the variant.
 * 3. Seller ships each order and the customer confirms delivery for both.
 * 4. Customer writes a review from each order (rating 4 then rating 5).
 * 5. Retrieves paginated review listing and validates pagination metadata,
 *    newest-first sort order, reviewer identity, and review content.
 */
export async function test_api_product_review_list_newest_first_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: { quantity_change: 100 },
    },
  );
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. First order → ship → deliver → review
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  const orderItem1 = order1.items[0];
  const shipment1 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order1.id },
        body: { orderItemIds: [orderItem1.id] },
      },
    );
  const confirmed1 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment1.id },
    );
  typia.assert(confirmed1);
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order1.id,
        shopping_mall_order_item_id: orderItem1.id,
        rating: 4,
        content: "First review — decent product",
      },
    },
  );
  // 4. Second order → ship → deliver → review
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  const orderItem2 = order2.items[0];
  const shipment2 =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order2.id },
        body: { orderItemIds: [orderItem2.id] },
      },
    );
  const confirmed2 =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      { shipmentId: shipment2.id },
    );
  typia.assert(confirmed2);
  await generate_random_shopping_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order2.id,
        shopping_mall_order_item_id: orderItem2.id,
        rating: 5,
        content: "Second review — excellent product",
      },
    },
  );
  // 5. Test: public paginated review listing
  const result = await api.functional.shoppingMall.products.reviews.index(
    connection,
    {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallReviewReview.IRequest,
    },
  );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    result.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination total records is 2",
    result.pagination.records === 2,
  );
  TestValidator.predicate(
    "pagination total pages is 1",
    result.pagination.pages === 1,
  );
  // Validate data count
  TestValidator.predicate("data array has 2 reviews", result.data.length === 2);
  const firstDisplayed = result.data[0];
  const secondDisplayed = result.data[1];
  // Validate sorting order: newest first (rating 5 before rating 4)
  TestValidator.equals("newest review rating is 5", firstDisplayed.rating, 5);
  TestValidator.equals(
    "newest review content",
    firstDisplayed.content,
    "Second review — excellent product",
  );
  TestValidator.equals("older review rating is 4", secondDisplayed.rating, 4);
  TestValidator.equals(
    "older review content",
    secondDisplayed.content,
    "First review — decent product",
  );
  // Validate reviewer identity matches active customer
  TestValidator.equals(
    "first reviewer display name",
    firstDisplayed.customer.display_name,
    customer.display_name,
  );
  TestValidator.equals(
    "second reviewer display name",
    secondDisplayed.customer.display_name,
    customer.display_name,
  );
  // Validate product reference
  TestValidator.equals(
    "first review references correct product",
    firstDisplayed.product.id,
    product.id,
  );
  TestValidator.equals(
    "second review references correct product",
    secondDisplayed.product.id,
    product.id,
  );
}
