import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_refund_request_snapshots_access_control_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerAPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerA);
  // Login as seller A to get approved status
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  const sellerALoggedIn = await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerA.email,
      password: sellerAPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerALoggedIn);
  // 2. Seller A creates product A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerALoginConnection,
    {
      body: {
        name: "Product A - Seller A's Item",
        description: "Test product from seller A",
        base_price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productA);
  // Add variant to product A
  const variantA =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerALoginConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          price: 10000,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variantA);
  // 3. Register and authenticate as seller B
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerBPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerB);
  // Login as seller B
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  const sellerBLoggedIn = await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerB.email,
      password: sellerBPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerBLoggedIn);
  // 4. Seller B creates product B
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBLoginConnection,
    {
      body: {
        name: "Product B - Seller B's Item",
        description: "Test product from seller B",
        base_price: 15000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productB);
  // Add variant to product B
  const variantB =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerBLoginConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          price: 15000,
          quantity: 10,
          option_values: [
            {
              key: "color",
              value: "Blue",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variantB);
  // 5. Register and authenticate as customer
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customer.email,
        password: customerPassword,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoggedIn);
  // 6. Customer places orders for both products
  // Order 1: Product A
  const orderA =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(orderA);
  // Get order item for product A
  const orderItemA = orderA.orderItems.find(
    (item) => item.productSnapshot.name === "Product A - Seller A's Item",
  );
  if (!orderItemA) {
    throw new Error("Order item A not found");
  }
  typia.assert(orderItemA);
  // Order 2: Product B
  const orderB =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(orderB);
  // Get order item for product B
  const orderItemB = orderB.orderItems.find(
    (item) => item.productSnapshot.name === "Product B - Seller B's Item",
  );
  if (!orderItemB) {
    throw new Error("Order item B not found");
  }
  typia.assert(orderItemB);
  // 7. Complete delivery for both orders
  // Create shipment for order A (by seller A)
  const shipmentA =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerALoginConnection,
      {
        body: {
          orderId: orderA.id,
          orderItemIds: [orderItemA.id],
          carrier: "FastShip",
          trackingNumber: `TRACK-A-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipmentA);
  // Confirm delivery for order A
  const confirmedShipmentA =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        orderId: orderA.id,
        shipmentId: shipmentA.id,
      },
    );
  typia.assert(confirmedShipmentA);
  // Create shipment for order B (by seller B)
  const shipmentB =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerBLoginConnection,
      {
        body: {
          orderId: orderB.id,
          orderItemIds: [orderItemB.id],
          carrier: "QuickShip",
          trackingNumber: `TRACK-B-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(shipmentB);
  // Confirm delivery for order B
  const confirmedShipmentB =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        orderId: orderB.id,
        shipmentId: shipmentB.id,
      },
    );
  typia.assert(confirmedShipmentB);
  // 8. Customer creates refund requests for both order items
  const refundRequestsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(refundRequestsResponse);
  // Find the refund request IDs for each order item
  const refundRequestA = refundRequestsResponse.data.find(
    (req) => req.orderItem.id === orderItemA.id,
  );
  const refundRequestB = refundRequestsResponse.data.find(
    (req) => req.orderItem.id === orderItemB.id,
  );
  if (!refundRequestA || !refundRequestB) {
    throw new Error("Refund requests not found");
  }
  typia.assert(refundRequestA);
  typia.assert(refundRequestB);
  // 9. Seller A approves their refund request (creates snapshot A)
  const approvedRefundA =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerALoginConnection,
      { requestId: refundRequestA.id },
    );
  typia.assert(approvedRefundA);
  TestValidator.equals("refund A status", approvedRefundA.status, "approved");
  // 10. Seller B rejects their refund request (creates snapshot B)
  const rejectedRefundB =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerBLoginConnection,
      {
        requestId: refundRequestB.id,
        body: {
          seller_response_reason: "Item was used and damaged",
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundB);
  TestValidator.equals("refund B status", rejectedRefundB.status, "rejected");
  // 11. Authenticate as seller A again (new connection)
  const sellerACheckConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerACheckConnection, {
    body: {
      email: sellerA.email,
      password: sellerAPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 12. Call PATCH /seller/refund-request-snapshots as seller A
  const snapshotsForSellerA =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerACheckConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsForSellerA);
  // 13. Verify only snapshot A (seller A's) is returned
  TestValidator.equals(
    "snapshot count for seller A",
    snapshotsForSellerA.data.length,
    1,
  );
  // 14. Verify snapshot B (seller B's) is NOT in the results
  const snapshotA = snapshotsForSellerA.data[0];
  TestValidator.equals(
    "snapshot A has approved status",
    snapshotA.seller_response,
    "approved",
  );
  TestValidator.equals(
    "snapshot A belongs to seller A",
    snapshotA.seller.id,
    sellerALoggedIn.id,
  );
  // 15. Verify the pagination total reflects only seller A's snapshots
  TestValidator.equals(
    "total records for seller A",
    snapshotsForSellerA.pagination.records,
    1,
  );
  // 16. Authenticate as seller B again (new connection)
  const sellerBCheckConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBCheckConnection, {
    body: {
      email: sellerB.email,
      password: sellerBPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 17. Call PATCH /seller/refund-request-snapshots as seller B
  const snapshotsForSellerB =
    await api.functional.ecommerceMall.seller.refund_request_snapshots.index(
      sellerBCheckConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsForSellerB);
  // 18. Verify only snapshot B (seller B's) is returned
  TestValidator.equals(
    "snapshot count for seller B",
    snapshotsForSellerB.data.length,
    1,
  );
  // 19. Verify snapshot A (seller A's) is NOT in the results
  const snapshotB = snapshotsForSellerB.data[0];
  TestValidator.equals(
    "snapshot B has rejected status",
    snapshotB.seller_response,
    "rejected",
  );
  TestValidator.equals(
    "snapshot B belongs to seller B",
    snapshotB.seller.id,
    sellerBLoggedIn.id,
  );
  // 20. This test ensures proper data isolation between sellers
  // Verify sellers cannot see each other's snapshots
  TestValidator.notEquals(
    "seller A snapshot not in B's list",
    snapshotA.id,
    snapshotB.id,
  );
  TestValidator.equals(
    "total records for seller B",
    snapshotsForSellerB.pagination.records,
    1,
  );
}
