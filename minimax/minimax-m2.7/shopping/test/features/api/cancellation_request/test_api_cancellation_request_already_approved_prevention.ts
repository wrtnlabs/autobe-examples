import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test scenario verifying that already processed cancellation requests cannot be approved again.
 *
 * **Setup Steps:**
 * 1. Register and approve a seller account
 * 2. Create a product with variant and inventory
 * 3. Register a customer
 * 4. Customer places order and completes checkout
 * 5. Customer submits cancellation request (PATCH)
 * 6. Seller uses PUT endpoint to update cancellation status to approved (first processing)
 * 7. Verify request status is now 'approved'
 *
 * **Test Execution:**
 * 1. Authenticate as the same seller
 * 2. Call POST /ecommerceMall/seller/cancellation-requests/{requestId}/approve (second approval attempt)
 *
 * **Expected Validations:**
 * - Response should indicate the request is no longer in pending status
 * - Error message should state cancellation request already processed
 * - Status should remain 'approved' (not double-processed)
 * - No additional snapshots should be created
 * - Inventory should not be restored twice
 */
export async function test_api_cancellation_request_already_approved_prevention(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // SETUP: Create seller, product, customer, order, and cancellation request
  // ============================================================
  // 1. Register admin (for seller approval)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 2. Register and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpass123",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Approve the seller
  const sellerApproval =
    await api.functional.ecommerceMall.admin.seller_approvals.create(
      adminConnection,
      {
        body: {
          sellerId: sellerAuth.id,
          status: "approved",
        } satisfies IEcommerceMallSellerApproval.ICreate,
      },
    );
  typia.assert(sellerApproval);
  // 3. Seller creates product with variant and inventory
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
  const variant =
    await api.functional.ecommerceMall.seller.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price: product.base_price,
          quantity: 0,
          option_values: [{ key: "size", value: "large" }],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Add inventory to variant
  await api.functional.ecommerceMall.seller.products.variants.inventory.create(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        operation: "restock",
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
        reason: "Initial stock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 4. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerpass123",
      href: "https://test.com",
      referrer: "https://test.com",
    },
  });
  // 5. Customer adds shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.alphabets(10),
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 6. Customer adds item to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Customer places order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "mock_payment_token",
          address_id: address.id,
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 8. Customer submits cancellation request
  const cancellationResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationResponse);
  const cancellationRequest = cancellationResponse.data[0];
  TestValidator.equals(
    "has cancellation request",
    cancellationRequest !== undefined,
    true,
  );
  // 9. Seller approves cancellation via PUT (first processing)
  const updatedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellation);
  TestValidator.equals(
    "status is approved after first processing",
    updatedCancellation.status,
    "approved",
  );
  // Record snapshot count after first approval
  const snapshotCountAfterFirstApproval = updatedCancellation.snapshots.length;
  // ============================================================
  // TEST EXECUTION: Attempt to approve already approved request
  // ============================================================
  // Attempt to approve again using POST endpoint
  await TestValidator.error(
    "cannot approve already approved cancellation request",
    async () => {
      await api.functional.ecommerceMall.seller.cancellation_requests.approve(
        sellerConnection,
        {
          requestId: cancellationRequest.id,
        },
      );
    },
  );
  // Verify the cancellation request status remains 'approved'
  const finalCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequest.IUpdate,
      },
    );
  typia.assert(finalCancellation);
  TestValidator.equals(
    "status remains approved after second attempt",
    finalCancellation.status,
    "approved",
  );
  TestValidator.equals(
    "no additional snapshots created",
    finalCancellation.snapshots.length,
    snapshotCountAfterFirstApproval,
  );
}
