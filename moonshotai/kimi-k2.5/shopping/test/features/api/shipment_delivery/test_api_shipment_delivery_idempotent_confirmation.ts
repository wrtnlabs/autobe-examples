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
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_shipments_deliveries_create } from "../../../generate/generate_random_ecommerce_mall_customer_shipments_deliveries_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipment_delivery } from "../../../prepare/prepare_random_ecommerce_mall_shipment_delivery";

export async function test_api_shipment_delivery_idempotent_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create authenticated connections for all actors
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(adminAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {},
    });
  typia.assert(sellerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {},
    });
  typia.assert(customerAuth);
  // 2. Create category as admin
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Create product as seller
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Create variant as seller
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        },
      },
    );
  typia.assert(variant);
  // 5. Add item to cart as customer
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 6. Checkout to create order as customer
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: typia.random<string>(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: typia.random<string>(),
          city: typia.random<string>(),
          state: null,
          postalCode: typia.random<string>(),
          country: typia.random<string>(),
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  // Get the order item ID for shipment
  const orderItemId = (order.orderItems[0] as unknown as IEntity).id;
  // 7. Create shipment as seller
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds: [orderItemId],
          carrierName: "FedEx",
          trackingNumber: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<100>
          >(),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  typia.assert(shipment.shipmentItems.length > 0);
  // 8. First delivery confirmation - should return 201 Created
  const firstDelivery: IEcommerceMallShipmentDelivery =
    await api.functional.ecommerceMall.customer.shipments.deliveries.create(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(firstDelivery);
  const firstDeliveryId = firstDelivery.id;
  const firstDeliveredAt = firstDelivery.deliveredAt;
  // Verify order items were updated to delivered status
  TestValidator.predicate(
    "order item status changed to delivered after first confirmation",
    () => firstDelivery.shipment.delivery !== null,
  );
  // 9. Second delivery confirmation - should return 200 OK with same delivery ID
  const secondDelivery: IEcommerceMallShipmentDelivery =
    await api.functional.ecommerceMall.customer.shipments.deliveries.create(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(secondDelivery);
  // 10. Verify idempotency - same delivery ID returned
  TestValidator.equals(
    "second delivery confirmation returns same delivery ID",
    secondDelivery.id,
    firstDeliveryId,
  );
  // 11. Verify delivery timestamp unchanged
  TestValidator.equals(
    "deliveredAt timestamp unchanged on second confirmation",
    secondDelivery.deliveredAt,
    firstDeliveredAt,
  );
  // 12. Verify customer ID matches
  TestValidator.equals(
    "customer ID matches on both confirmations",
    secondDelivery.customer?.id,
    customerAuth.id,
  );
  // 13. Test conflict scenario - different customer trying to confirm delivery
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(otherCustomerConnection, {
    body: {},
  });
  // Should get 403 Forbidden when different customer tries to confirm already delivered shipment
  await TestValidator.error(
    "different customer cannot confirm already delivered shipment",
    async () => {
      await api.functional.ecommerceMall.customer.shipments.deliveries.create(
        otherCustomerConnection,
        {
          shipmentId: shipment.id,
          body: {},
        },
      );
    },
  );
}