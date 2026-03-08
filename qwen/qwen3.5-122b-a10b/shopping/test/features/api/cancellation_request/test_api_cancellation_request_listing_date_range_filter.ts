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

export async function test_api_cancellation_request_listing_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. SETUP: Create seller and approve
  // ============================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // ============================================
  // 2. SETUP: Create category and product
  // ============================================
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
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
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: "Red" },
          ] as IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ============================================
  // 3. SETUP: Create customer and order
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(10),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
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
  const orderItem = order.order_items[0];
  // ============================================
  // 4. Create first cancellation request at T1
  // ============================================
  const request1 =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: "Changed my mind",
        } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
      },
    );
  typia.assert(request1);
  const requestedAt1 = request1.requested_at;
  // Wait to establish time difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // ============================================
  // 5. Create second order item for second request
  // ============================================
  // Need a second order item since cancellation requests are per order item
  const cartItem2 =
    await api.functional.ecommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  const order2 = await api.functional.ecommerceMall.customer.orders.create(
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
  typia.assert(order2);
  const orderItem2 = order2.order_items[0];
  // ============================================
  // 6. Create second cancellation request at T2
  // ============================================
  const request2 =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.create(
      customerConnection,
      {
        orderItemId: orderItem2.id,
        body: {
          reason: "Found better price",
        } satisfies IEcommerceMallOrderItemCancellationRequest.ICreate,
      },
    );
  typia.assert(request2);
  const requestedAt2 = request2.requested_at;
  // ============================================
  // 7. Test requested_at_from filter
  // ============================================
  // Filter for requests after T1 (should include both)
  const fromT1 = new Date(requestedAt1);
  fromT1.setSeconds(fromT1.getSeconds() - 1); // Go back 1 second
  const filteredFromT1 =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_from: fromT1.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredFromT1);
  TestValidator.equals(
    "requested_at_from filter returns request1",
    filteredFromT1.data.length,
    1,
  );
  TestValidator.equals(
    "request1 ID matches",
    filteredFromT1.data[0].id,
    request1.id,
  );
  // Filter for requests after T2 (should include only request2)
  const fromT2 = new Date(requestedAt2);
  fromT2.setSeconds(fromT2.getSeconds() - 1); // Go back 1 second
  const filteredFromT2 =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem2.id,
        body: {
          requested_at_from: fromT2.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredFromT2);
  TestValidator.equals(
    "requested_at_from filter returns request2",
    filteredFromT2.data.length,
    1,
  );
  TestValidator.equals(
    "request2 ID matches",
    filteredFromT2.data[0].id,
    request2.id,
  );
  // ============================================
  // 8. Test requested_at_to filter
  // ============================================
  // Filter for requests until T1 (should include only request1)
  const toT1 = new Date(requestedAt1);
  toT1.setSeconds(toT1.getSeconds() + 1); // Go forward 1 second
  const filteredToT1 =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_to: toT1.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredToT1);
  TestValidator.equals(
    "requested_at_to filter returns request1",
    filteredToT1.data.length,
    1,
  );
  TestValidator.equals(
    "request1 ID matches",
    filteredToT1.data[0].id,
    request1.id,
  );
  // ============================================
  // 9. Test responded_at filter by approving request1
  // ============================================
  const approvedRequest =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.update(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        requestId: request1.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  const respondedAt1 = approvedRequest.responded_at;
  // Wait before creating another response
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // Reject request2
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.update(
      sellerConnection,
      {
        orderItemId: orderItem2.id,
        requestId: request2.id,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallOrderItemCancellationRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  const respondedAt2 = rejectedRequest.responded_at;
  // ============================================
  // 10. Test responded_at_from filter
  // ============================================
  // Filter for responded requests from before T1 (should include both)
  const respondedFromBefore = new Date(
    respondedAt1 ?? new Date().toISOString(),
  );
  respondedFromBefore.setSeconds(respondedFromBefore.getSeconds() - 1);
  const filteredRespondedFromBefore =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          responded_at_from: respondedFromBefore.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredRespondedFromBefore);
  TestValidator.equals(
    "responded_at_from filter returns approved request",
    filteredRespondedFromBefore.data.length,
    1,
  );
  TestValidator.equals(
    "approved request ID matches",
    filteredRespondedFromBefore.data[0].id,
    request1.id,
  );
  // Filter for responded requests from after T1 (should include only request2)
  const respondedFromAfter = new Date(respondedAt1 ?? new Date().toISOString());
  respondedFromAfter.setSeconds(respondedFromAfter.getSeconds() + 1);
  const filteredRespondedFromAfter =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem2.id,
        body: {
          responded_at_from: respondedFromAfter.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredRespondedFromAfter);
  TestValidator.equals(
    "responded_at_from filter returns rejected request",
    filteredRespondedFromAfter.data.length,
    1,
  );
  TestValidator.equals(
    "rejected request ID matches",
    filteredRespondedFromAfter.data[0].id,
    request2.id,
  );
  // ============================================
  // 11. Test responded_at_to filter
  // ============================================
  // Filter for responded requests until after T1 (should include request1)
  const respondedToAfter = new Date(respondedAt1 ?? new Date().toISOString());
  respondedToAfter.setSeconds(respondedToAfter.getSeconds() + 1);
  const filteredRespondedToAfter =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          responded_at_to: respondedToAfter.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredRespondedToAfter);
  TestValidator.equals(
    "responded_at_to filter returns approved request",
    filteredRespondedToAfter.data.length,
    1,
  );
  TestValidator.equals(
    "approved request ID matches",
    filteredRespondedToAfter.data[0].id,
    request1.id,
  );
  // ============================================
  // 12. Test combined filters
  // ============================================
  // Combined requested_at_from and requested_at_to
  const combinedFilter =
    await api.functional.ecommerceMall.seller.order_items.cancellation_requests.index(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          requested_at_from: fromT1.toISOString(),
          requested_at_to: toT1.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined date range filter returns request1",
    combinedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "request1 ID matches",
    combinedFilter.data[0].id,
    request1.id,
  );
}
