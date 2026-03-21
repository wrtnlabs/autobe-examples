import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
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
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_cancellation_snapshot_retrieval_forbidden_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  // =================================================================
  // SCENARIO: Test that a seller cannot retrieve a cancellation request
  // snapshot belonging to another seller. This validates authorization
  // enforcement where the system verifies that the authenticated seller
  // owns the cancellation request through the ecommerce_mall_seller_id
  // foreign key. Seller B should receive a 403 Forbidden error when
  // attempting to access seller A's cancellation request snapshot.
  // =================================================================
  // Step 1: Register and authenticate Seller A (owner of the cancellation request)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAResult = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAResult);
  const sellerAId = sellerAResult.id;
  // Step 2: Register and authenticate Seller B (non-owner, should be forbidden)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBResult = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBResult);
  // Step 3: Register and authenticate Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_customer_join(customerConnection, {});
  typia.assert(customerResult);
  // Step 4: Seller A creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Step 5: Create product variant with inventory for Seller A's product
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          quantity: 10,
        },
      },
    );
  typia.assert(variant);
  // Step 6: Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Step 7: Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // Step 8: Create shipping address for customer
  const shippingAddress =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: "Test Customer",
          phone: "01012345678",
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
        },
      },
    );
  typia.assert(shippingAddress);
  // Step 9: Customer confirms order (creates order with paid status)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
          address_id: shippingAddress.id,
        },
      },
    );
  typia.assert(order);
  // Step 10: Get the order item from Seller A's order items
  const sellerAOrderItem = order.orderItems.find(
    (item) => item.productSnapshot.name === product.name,
  )!;
  TestValidator.equals(
    "seller A order item exists",
    sellerAOrderItem !== null,
    true,
  );
  // Step 11: Customer requests cancellation for the order item
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(cancellationRequest);
  // Find the cancellation request for Seller A's order item
  const targetCancellationRequest = cancellationRequest.data.find(
    (req) => req.orderItem.id === sellerAOrderItem.id,
  )!;
  TestValidator.equals(
    "cancellation request exists",
    targetCancellationRequest !== null,
    true,
  );
  // Step 12: Seller A approves cancellation (creates snapshot)
  const approvedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerAConnection,
      {
        requestId: targetCancellationRequest.id,
      },
    );
  typia.assert(approvedCancellation);
  // Get the snapshot ID from the approved cancellation
  const snapshotId = approvedCancellation.snapshots[0].id;
  TestValidator.equals("snapshot was created", snapshotId !== null, true);
  // Step 13: Seller B attempts to retrieve Seller A's cancellation request snapshot
  // This should fail with 403 Forbidden because Seller B does not own the cancellation request
  await TestValidator.error(
    "Seller B cannot retrieve Seller A's cancellation request snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_request_snapshots.at(
        sellerBConnection,
        {
          snapshotId: snapshotId,
        },
      );
    },
  );
}
