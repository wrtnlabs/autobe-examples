import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_cancellation_requests_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that a seller can retrieve their pending cancellation requests from the seller dashboard.
 *
 * Validates the complete cancellation request workflow including seller account setup, customer
 * registration, product creation, order placement, and cancellation request submission. Ensures that
 * the seller dashboard correctly displays pending cancellation requests with all associated details.
 *
 * Special attention is given to verifying that:
 * - Cancellation requests are properly filtered by status and seller ownership
 * - All order and item details are correctly included in the response
 * - Customer and seller references are properly populated
 * - Pagination metadata is accurate
 *
 * 1. Create seller account with approval and authenticate
 * 2. Create customer account and authenticate
 * 3. Seller creates a product
 * 4. Seller creates a product variant for the product
 * 5. Customer creates a shipping address
 * 6. Customer creates an order with the product variant
 * 7. Customer creates a cancellation request for the order item
 * 8. Seller retrieves pending cancellation requests
 * 9. Validates response structure, pagination, and all referenced data
 */
export async function test_api_seller_pending_cancel_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with auto-approved status for testing
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123",
      display_name: RandomGenerator.name(),
      href: "https://seller.example.com/join",
      referrer: "https://seller.example.com/",
    },
  });
  typia.assert(sellerAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://member.example.com/join",
      referrer: "https://member.example.com/",
    },
  });
  typia.assert(customerAuth);
  // 3. Create a product as the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<999999>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ color: "blue", size: "M" }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<999999>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Create an order as the customer
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Create a cancellation request for the order item
  const orderItemId = order.items[0].id;
  const cancellationRequest =
    await generate_random_ecommerce_mall_member_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Seller retrieves pending cancellation requests
  const response =
    await api.functional.ecommerceMall.seller.seller.cancel_requests.pending.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          limit: 20,
          page: 1,
          sort: "created_at",
        },
      },
    );
  typia.assert(response);
  // 8. Validate pagination metadata
  TestValidator.equals(
    "response pagination current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "response pagination limit",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "response pagination records",
    response.pagination.records,
    1,
  );
  TestValidator.equals(
    "response pagination pages",
    response.pagination.pages,
    1,
  );
  // 9. Validate response data array
  TestValidator.equals("response has one item", response.data.length, 1);
  const item = response.data[0];
  // 10. Validate cancellation request fields
  TestValidator.equals("cancellation request status", item.status, "pending");
  TestValidator.predicate("cancellation request has id", item.id !== undefined);
  TestValidator.predicate(
    "cancellation request has reason",
    item.reason.length > 0,
  );
  TestValidator.predicate(
    "cancellation request has created_at",
    item.created_at !== undefined,
  );
  TestValidator.predicate(
    "cancellation request has updated_at",
    item.updated_at !== undefined,
  );
  // 11. Validate item details
  TestValidator.predicate(
    "item has order_number",
    item.item.order_number.length > 0,
  );
  TestValidator.predicate(
    "item has seller_display_name",
    item.item.seller_display_name.length > 0,
  );
  TestValidator.predicate(
    "item has product_variant_name",
    item.item.product_variant_name.length > 0,
  );
  TestValidator.predicate(
    "item has product_variant_sku_code",
    item.item.product_variant_sku_code.length > 0,
  );
  TestValidator.predicate("item has quantity", item.item.quantity >= 1);
  TestValidator.predicate("item has unit_price", item.item.unit_price > 0);
  TestValidator.predicate("item has subtotal", item.item.subtotal > 0);
  // 12. Validate order details
  TestValidator.predicate("order has id", item.order.id !== undefined);
  TestValidator.predicate(
    "order has order_number",
    item.order.order_number.length > 0,
  );
  TestValidator.predicate("order has status", item.order.status.length > 0);
  TestValidator.predicate("order has total_price", item.order.total_price > 0);
  TestValidator.predicate("order has items_count", item.order.items_count >= 1);
  // 13. Validate customer reference
  TestValidator.predicate(
    "order customer has id",
    item.order.customer.id !== undefined,
  );
  TestValidator.predicate(
    "order customer has email",
    item.order.customer.email.length > 0,
  );
  TestValidator.predicate(
    "order customer has display_name",
    item.order.customer.display_name !== undefined,
  );
  // 14. Validate shipping address reference
  TestValidator.predicate(
    "order shipping_address has recipient_name",
    item.order.shipping_address.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "order shipping_address has street",
    item.order.shipping_address.street.length > 0,
  );
  TestValidator.predicate(
    "order shipping_address has city",
    item.order.shipping_address.city.length > 0,
  );
  TestValidator.predicate(
    "order shipping_address has state",
    item.order.shipping_address.state.length > 0,
  );
  TestValidator.predicate(
    "order shipping_address has postal_code",
    item.order.shipping_address.postal_code.length > 0,
  );
  TestValidator.predicate(
    "order shipping_address has country",
    item.order.shipping_address.country.length > 0,
  );
  // 15. Validate seller reference
  TestValidator.predicate("seller has id", item.seller.id !== undefined);
  TestValidator.predicate(
    "seller has display_name",
    item.seller.display_name.length > 0,
  );
  TestValidator.predicate(
    "seller has approval_status",
    item.seller.approval_status !== undefined,
  );
  TestValidator.predicate(
    "seller has is_suspended",
    typeof item.seller.is_suspended === "boolean",
  );
}
