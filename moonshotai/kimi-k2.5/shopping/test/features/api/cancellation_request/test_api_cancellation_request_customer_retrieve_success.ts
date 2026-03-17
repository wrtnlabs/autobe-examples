import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_cancellation_request_customer_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Step 2: Create seller registration
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  const registrationWithId = typia.assert<IEntity>(registration);
  // Step 3: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 4: Approve seller registration
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: registrationWithId.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // Step 5: Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // Step 6: Create product as approved seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  // Step 7: Create variant as seller
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {},
      },
    );
  // Step 8: Add inventory as seller
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: {
        variantId: variant.id,
      },
      body: {
        quantity: 100,
        reason: "Initial stock",
      } satisfies Partial<IEcommerceMallInventoryRecord.ICreate>,
    },
  );
  // Step 9: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // Step 10: Add variant to cart as customer
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies Partial<IEcommerceMallCartItem.ICreate>,
    },
  );
  // Step 11: Checkout to create order as customer
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Recipient",
        recipientPhone: "01012345678",
        streetAddress: "123 Test Street",
        city: "Test City",
        state: null,
        postalCode: "12345",
        country: "Test Country",
      } satisfies Partial<IEcommerceMallOrder.ICreate>,
    },
  );
  // Step 12: Create cancellation request for the order item as customer
  const orderItemRaw = order.orderItems[0];
  const orderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(orderItemRaw);
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind",
        } satisfies Partial<IEcommerceMallCancellationRequest.ICreate>,
      },
    );
  // Step 13: Retrieve cancellation request as customer (the actual test)
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.cancellationRequests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  // Step 14: Validate response structure and data
  typia.assert(retrievedRequest);
  // Validate entity data matches
  TestValidator.equals(
    "cancellation request id matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "status matches",
    retrievedRequest.status,
    cancellationRequest.status,
  );
  // Validate nested orderItem data
  TestValidator.equals(
    "order item id matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item status matches",
    retrievedRequest.orderItem.status,
    orderItem.status as "paid" | "shipped" | "delivered" | "cancelled" | "refunded" | null | undefined,
  );
  TestValidator.predicate(
    "order item product exists",
    retrievedRequest.orderItem.product !== null,
  );
  TestValidator.predicate(
    "order item variant exists",
    retrievedRequest.orderItem.variant !== null,
  );
  // Validate customer summary
  TestValidator.equals(
    "customer id matches",
    retrievedRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRequest.customer.email,
    customer.email,
  );
  // Validate seller summary (should not be null for valid order)
  TestValidator.predicate("seller exists", retrievedRequest.seller !== null);
  if (retrievedRequest.seller !== null) {
    TestValidator.equals(
      "seller id matches",
      retrievedRequest.seller.id,
      seller.id,
    );
  }
  // Validate status is valid
  TestValidator.predicate(
    "status is valid",
    ["pending", "approved", "rejected"].includes(retrievedRequest.status),
  );
  // Validate snapshots array
  TestValidator.predicate(
    "snapshots is array",
    Array.isArray(retrievedRequest.snapshots),
  );
}