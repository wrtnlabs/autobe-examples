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
 * Test that attempting to update a cancellation request that has already been responded to (approved or rejected) is prevented by the system.
 *
 * **Setup**: Create a complete order flow with a seller's product, customer's order, and a cancellation request that has already been responded to.
 *
 * **Test Steps**:
 * 1. Administrator authenticates via `/auth/admin/join`
 * 2. Create category for product classification
 * 3. Seller registers and gets approved by admin
 * 4. Seller creates product with variant
 * 5. Customer registers, creates address, adds item to cart, places order
 * 6. Customer creates cancellation request for the order item
 * 7. Admin responds to cancellation request (approve or reject) - this sets up the 'already resolved' state
 * 8. Attempt to update the same cancellation request again with a different status (THIS IS THE TEST)
 * 9. Verify the system rejects the request with appropriate error
 * 10. Verify the cancellation request status remains unchanged
 *
 * **Validation Points**:
 * - System validates cancellation request status is 'pending' before allowing update
 * - Already responded requests (status='approved' or status='rejected') cannot be modified
 * - Error response indicates the cancellation request has already been responded to
 * - Cancellation request status remains in its current state
 */
export async function test_api_admin_update_already_resolved_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create category for product classification
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Approve seller
  await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.seller.id,
  });
  // 4. Seller creates product with variant
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
          ],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create shipping address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: `${typia.random<number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(2)}`,
        city: RandomGenerator.name(2),
        state_province: RandomGenerator.name(2),
        postal_code: RandomGenerator.alphabets(5),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // Add item to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Place order
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
  typia.assert(orderItem);
  // 6. Customer creates cancellation request for the order item
  const cancellationRequest =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial status is pending
  TestValidator.equals(
    "cancellation request status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 7. Admin responds to cancellation request (approve) - this sets up the 'already resolved' state
  const firstResponse =
    await api.functional.ecommerceMall.admin.order_items.cancellation_requests.update(
      adminConnection,
      {
        orderItemId: orderItem.id,
        requestId: cancellationRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IUpdate,
      },
    );
  typia.assert(firstResponse);
  // Verify the status is now approved
  TestValidator.equals(
    "cancellation request status after first response is approved",
    firstResponse.status,
    "approved",
  );
  const respondedAt = firstResponse.responded_at;
  TestValidator.predicate(
    "responded_at is set after first response",
    respondedAt !== null,
  );
  // 8. Attempt to update the same cancellation request again with a different status (THIS IS THE TEST)
  await TestValidator.error(
    "attempting to update already resolved cancellation request should fail",
    async () => {
      await api.functional.ecommerceMall.admin.order_items.cancellation_requests.update(
        adminConnection,
        {
          orderItemId: orderItem.id,
          requestId: cancellationRequest.id,
          body: {
            status: "rejected", // Try to change from approved to rejected
          } satisfies IEcommerceMallOrderItemCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 9. Verify the cancellation request status remains unchanged
  const finalRequest =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: "test",
        } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
      },
    );
  // The request should still be in approved status
  TestValidator.equals(
    "cancellation request status remains approved after failed update attempt",
    finalRequest.status,
    "approved",
  );
  // responded_at should remain unchanged
  TestValidator.equals(
    "responded_at remains unchanged after failed update attempt",
    finalRequest.responded_at,
    respondedAt,
  );
}