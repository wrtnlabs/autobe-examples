import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_order_items_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_cancellation_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test administrator filtering cancellation requests by status and date range.
 *
 * This test validates the admin endpoint for filtering order item cancellation requests
 * with various combinations of status and date range filters.
 *
 * Note: Since each order item can only have one cancellation request at a time,
 * the filtering tests verify that the correct request is returned (or not returned)
 * based on the filter criteria.
 */
export async function test_api_admin_filter_cancellation_requests_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Create admin, seller, customer ==========
  // Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Approve seller
  await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.seller.id,
  });
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Create product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Create customer address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(10),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // ========== CREATE ORDERS WITH DIFFERENT CANCELLATION REQUEST STATUSES ==========
  const orderItems: IEcommerceMallOrderItem.ISummary[] = [];
  // Create 3 orders with different cancellation request statuses
  await ArrayUtil.asyncRepeat(3, async (index) => {
    // Add to cart
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
    // Create order
    const order = await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: address.recipientName,
          shipping_phone_number: address.phoneNumber,
          shipping_street_address: address.streetAddress,
          shipping_city: address.city,
          shipping_state: address.stateProvince,
          shipping_postal_code: address.postalCode,
          shipping_country: address.country,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
    typia.assert(order);
    // Get order item
    const orderItem = order.order_items[0];
    orderItems.push(orderItem);
    // Create cancellation request
    const request =
      await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
        customerConnection,
        {
          orderItemId: orderItem.id,
          body: {
            reason: `Cancellation reason for order ${index + 1}`,
          } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
        },
      );
    typia.assert(request);
    // Respond to request based on index
    if (index === 0) {
      // Approve first request
      await api.functional.ecommerceMall.seller.order_items.cancellation_requests.update(
        sellerConnection,
        {
          orderItemId: orderItem.id,
          requestId: request.id,
          body: { status: "approved" },
        },
      );
    } else if (index === 1) {
      // Reject second request
      await api.functional.ecommerceMall.seller.order_items.cancellation_requests.update(
        sellerConnection,
        {
          orderItemId: orderItem.id,
          requestId: request.id,
          body: { status: "rejected" },
        },
      );
    }
    // Third request remains pending
  });
  // ========== TEST FILTERING BY STATUS ==========
  // Test filter by approved status - should return the request
  const approvedFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: { status: "approved" },
      },
    );
  typia.assert(approvedFilter);
  TestValidator.equals(
    "approved status filter returns matching request",
    approvedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "approved filter result has correct status",
    approvedFilter.data[0].status,
    "approved",
  );
  // Test filter by approved status on pending request - should return empty
  const approvedOnPending =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[2].id,
        body: { status: "approved" },
      },
    );
  typia.assert(approvedOnPending);
  TestValidator.equals(
    "approved status filter on pending request returns empty",
    approvedOnPending.data.length,
    0,
  );
  // Test filter by rejected status
  const rejectedFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[1].id,
        body: { status: "rejected" },
      },
    );
  typia.assert(rejectedFilter);
  TestValidator.equals(
    "rejected status filter returns matching request",
    rejectedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "rejected filter result has correct status",
    rejectedFilter.data[0].status,
    "rejected",
  );
  // Test filter by pending status
  const pendingFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[2].id,
        body: { status: "pending" },
      },
    );
  typia.assert(pendingFilter);
  TestValidator.equals(
    "pending status filter returns matching request",
    pendingFilter.data.length,
    1,
  );
  TestValidator.equals(
    "pending filter result has correct status",
    pendingFilter.data[0].status,
    "pending",
  );
  // ========== TEST FILTERING BY DATE RANGE ==========
  // Get the created request
  const originalRequest =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {},
      },
    );
  typia.assert(originalRequest);
  TestValidator.equals(
    "get all requests returns the request",
    originalRequest.data.length,
    1,
  );
  // Filter by date range that includes the request
  const requestTime = new Date(originalRequest.data[0].requestedAt);
  const fromTime = new Date(requestTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const toTime = new Date(requestTime.getTime() + 60 * 60 * 1000); // 1 hour after
  const dateRangeFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {
          requested_at_from: fromTime.toISOString(),
          requested_at_to: toTime.toISOString(),
        },
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter includes request within range",
    dateRangeFilter.data.length,
    1,
  );
  // Filter by date range that excludes the request
  const excludedDateFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {
          requested_at_from: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ).toISOString(), // tomorrow
        },
      },
    );
  typia.assert(excludedDateFilter);
  TestValidator.equals(
    "date range filter excludes request outside range",
    excludedDateFilter.data.length,
    0,
  );
  // ========== TEST COMPOUND FILTERING ==========
  // Combine status and date filters
  const compoundFilter =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {
          status: "approved",
          requested_at_from: fromTime.toISOString(),
          requested_at_to: toTime.toISOString(),
        },
      },
    );
  typia.assert(compoundFilter);
  TestValidator.equals(
    "compound filter returns matching request",
    compoundFilter.data.length,
    1,
  );
  TestValidator.equals(
    "compound filter result has correct status",
    compoundFilter.data[0].status,
    "approved",
  );
  // Compound filter with mismatched status
  const compoundMismatch =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {
          status: "pending",
          requested_at_from: fromTime.toISOString(),
          requested_at_to: toTime.toISOString(),
        },
      },
    );
  typia.assert(compoundMismatch);
  TestValidator.equals(
    "compound filter with mismatched status returns empty",
    compoundMismatch.data.length,
    0,
  );
  // ========== TEST PAGINATION ==========
  // Test pagination with limit
  const paginated =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.index(
      adminConnection,
      {
        orderItemId: orderItems[0].id,
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit is respected",
    paginated.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination current page is correct",
    paginated.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    paginated.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination data array length matches records",
    paginated.data.length,
    paginated.pagination.records,
  );
}