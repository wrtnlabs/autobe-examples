import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_admin_refund_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: "Test Admin",
      href: "https://test.com/admin",
      referrer: "https://test.com",
    },
  });
  // 2. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://test.com/seller",
      referrer: "https://test.com",
    },
  });
  // 3. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      href: "https://test.com/customer",
      referrer: "https://test.com",
    },
  });
  // 4. Create a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create a product variant
  const variant =
    await api.functional.ecommerceMall.seller.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: product.base_price,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          option_values: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Add inventory to the variant
  await api.functional.ecommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        operation: "restock",
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<5>>(),
        reason: "Initial stock for testing",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 7. Create shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 8. Add item to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 10. Confirm order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 11. Get order details
  const orderDetails = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetails);
  const orderItemId = orderDetails.order_items[0]?.id;
  TestValidator.predicate("order item exists", orderItemId !== undefined);
  // 12. Create shipment
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId!],
        carrier: "DHL",
        trackingNumber: `TRACK${RandomGenerator.alphaNumeric(10)}`,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 13. Confirm delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 14. Search for refund requests for the delivered order item
  // The refund request needs to exist before we can test admin snapshots retrieval
  // In this test flow, we'll search for existing refund requests and use one if available
  const existingRefundRequests =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(existingRefundRequests);
  // Get refund request ID - use existing or search for any available
  let refundRequestId: string | undefined;
  if (existingRefundRequests.data.length > 0) {
    refundRequestId = existingRefundRequests.data[0].id;
  } else {
    // Search all refund requests for this seller
    const sellerRefundRequests =
      await api.functional.ecommerceMall.customer.refund_requests.index(
        sellerConnection,
        {
          body: {
            limit: 1,
          } satisfies IEcommerceMallRefundRequest.IRequest,
        },
      );
    typia.assert(sellerRefundRequests);
    if (sellerRefundRequests.data.length > 0) {
      refundRequestId = sellerRefundRequests.data[0].id;
    }
  }
  // 15. Seller approves refund request to create snapshot
  if (refundRequestId) {
    const approvedRefund =
      await api.functional.ecommerceMall.seller.refund_requests.approve(
        sellerConnection,
        {
          requestId: refundRequestId,
        },
      );
    typia.assert(approvedRefund);
  }
  // 16. Test admin retrieves refund request snapshots
  // Admin should be able to access snapshots for any refund request
  const snapshotsResponse =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.index(
      adminConnection,
      {
        requestId: refundRequestId!,
        body: {
          page: 1,
          limit: 10,
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Validate response structure
  TestValidator.equals(
    "has pagination data",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  // Validate pagination metadata
  const pagination = snapshotsResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // Validate snapshot data structure if snapshots exist
  for (const snapshot of snapshotsResponse.data) {
    TestValidator.predicate(
      "has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.equals(
      "has snapshot_reason",
      typeof snapshot.snapshot_reason === "string",
      true,
    );
    TestValidator.equals(
      "has snapshot_status",
      typeof snapshot.snapshot_status === "string",
      true,
    );
    TestValidator.equals(
      "has seller_response",
      typeof snapshot.seller_response === "string",
      true,
    );
    TestValidator.equals(
      "has valid created_at",
      typeof snapshot.created_at === "string",
      true,
    );
    TestValidator.equals(
      "has customer summary",
      snapshot.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "has seller summary",
      snapshot.seller !== undefined,
      true,
    );
    TestValidator.equals(
      "has refundRequest summary",
      snapshot.refundRequest !== undefined,
      true,
    );
  }
  // Validate ordering - newest first (descending by created_at)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = new Date(snapshotsResponse.data[i].created_at).getTime();
      const next = new Date(snapshotsResponse.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
        current >= next,
      );
    }
  }
}