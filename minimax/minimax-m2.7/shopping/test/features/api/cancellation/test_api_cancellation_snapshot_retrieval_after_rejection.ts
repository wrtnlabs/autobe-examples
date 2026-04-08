import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_snapshot_retrieval_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Test Recipient",
          phone: "01012345678",
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 4. Seller creates product with inventory
  // Note: categoryId should be provided or the product creation will fail
  // Using a valid UUID format for testing
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Cancellation",
        description: "A product for testing cancellation snapshot retrieval",
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 10000,
      },
    },
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  if (!variant) {
    throw new Error("Product should have at least one variant");
  }
  // 5. Add inventory to the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          quantity: 10,
          operationType: "restock",
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // 6. Customer adds product to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer checks out - creates order with paid items
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.orderItems[0];
  if (!orderItem) {
    throw new Error("Order should have at least one item");
  }
  // 8. Customer submits cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind about this purchase",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Get the cancellation request ID for seller operations
  const cancellationRequestId = cancellationRequest.cancellationRequest.id;
  // 9. Seller rejects the cancellation request with reason
  // This creates an immutable snapshot
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.cancellation_requests.reject(
      sellerConnection,
      {
        requestId: cancellationRequestId,
        body: {
          reason: "Item has already been prepared for shipment",
        },
      },
    );
  typia.assert(rejectedRequest);
  // 10. Retrieve the snapshot ID from the rejected request
  // The rejection response should contain the snapshot information
  // The snapshot ID is needed to call the GET endpoint
  // We extract it from the rejected request structure
  const snapshotId = (rejectedRequest as IEcommerceMallCancellationRequest).id;
  // 11. Customer retrieves the snapshot using GET endpoint
  const snapshot =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        requestId: cancellationRequestId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 12. Validate snapshot data - ensures immutable record for dispute resolution
  TestValidator.equals(
    "snapshot status is rejected",
    snapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "snapshot preserves original cancellation reason",
    snapshot.reason,
    "Changed my mind about this purchase",
  );
  TestValidator.predicate(
    "snapshot has valid UUID id",
    /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "snapshot has valid ISO timestamp",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  TestValidator.equals(
    "snapshot belongs to correct cancellation request",
    snapshot.cancellationRequest.id,
    cancellationRequestId,
  );
}
