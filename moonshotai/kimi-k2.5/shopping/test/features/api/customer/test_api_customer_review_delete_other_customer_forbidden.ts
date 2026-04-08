import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_review_delete_other_customer_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create seller connection and join as seller, approve seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Approve seller registration by admin
  const registrations =
    await api.functional.ecommerceMall.admin.registrations.update(
      adminConnection,
      {
        registrationId: seller.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(registrations);
  // Step 3: Seller creates product with variant
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 10000,
          options: [
            {
              optionName: "Color",
              optionValue: "Black",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 4: Create customer A connection, join, add product to cart, create address, place order
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // Add product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Create address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerAConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        state: "Seoul",
        postalCode: "12345",
        country: "Korea",
      } satisfies IEcommerceMallCustomer.ICreate,
    },
  );
  typia.assert(address);
  // Place order - need to find order items first
  const orders = await api.functional.ecommerceMall.customer.orders.index(
    customerAConnection,
    {
      body: {
        status: null,
        customerId: null,
        minTotalPrice: null,
        maxTotalPrice: null,
        createdAfter: null,
        createdBefore: null,
        orderNumber: null,
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orders);
  // Get order items for customer A's order
  const orderItems =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          orderId: undefined,
          productId: product.id,
          variantId: variant.id,
          sellerId: undefined,
          status: "paid",
          createdAtFrom: undefined,
          createdAtTo: undefined,
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItems);
  const orderItem = orderItems.data.find(
    (oi) => oi.product.id === product.id && oi.variant.id === variant.id,
  );
  if (!orderItem) throw new Error("Order item not found");
  // Step 5: Seller ships the order item for customer A
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(10),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Step 6: Get shipment ID and customer A confirms delivery
  const shipments = await api.functional.ecommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: null,
        sellerId: null,
        carrierName: null,
        status: null,
        shippedAtFrom: null,
        shippedAtTo: null,
        page: 1,
        limit: 10,
        search: null,
        sort: null,
        order: null,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(shipments);
  const shipmentForDelivery = shipments.data.find((s) => s.id === shipment.id);
  if (!shipmentForDelivery) throw new Error("Shipment not found");
  // Customer A confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm(
      customerAConnection,
      {
        shipmentId: shipmentForDelivery.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // Step 7: Customer A creates a review for the delivered order item
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerAConnection,
    {
      body: {
        orderItemId: orderItem.id,
        rating: 5,
        content: "Great product! Highly recommended.",
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Step 8: Create customer B connection and join as customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // Test: As customer B, attempt to delete customer A's review - should return 403 Forbidden
  await TestValidator.error(
    "customer B should not be allowed to delete customer A's review",
    async () => {
      await api.functional.ecommerceMall.customer.reviews.erase(
        customerBConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
}
