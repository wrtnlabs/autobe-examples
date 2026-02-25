import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import type { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
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
import { generate_random_ecommerce_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_customer_carts_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { generate_random_ecommerce_seller_shipments_create } from "../../../generate/generate_random_ecommerce_seller_shipments_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_customer_delivery_confirmation_successful_receipt(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Seller creates product (skip category for now)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(), // Will handle category separately
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller creates product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(10),
          option_values: `{"color":"red","size":"M"}`,
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Seller adds inventory
  const inventoryStatus =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5>
          >(),
          reason: "initial_stock",
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(inventoryStatus);
  // Customer creates shopping cart
  const cartRequest = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        customer_id: customer.id,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(cartRequest);
  TestValidator.predicate("cart created", cartRequest.data.length > 0);
  const cart = cartRequest.data[0];
  // Customer adds item to cart
  const cartItem = await generate_random_ecommerce_customer_carts_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceCartItem.ICreate,
      params: { cartId: cart.id },
    },
  );
  typia.assert(cartItem);
  // Customer completes checkout
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerConnection,
    {
      body: {
        customer_id: customer.id,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Seller creates shipment
  const shipment = await generate_random_ecommerce_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_number: RandomGenerator.alphaNumeric(15),
        carrier_name: "Test Carrier",
        shipping_cost: typia.random<number & tags.Minimum<0>>(),
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerce.customer.shipments.delivery_confirm.deliveryConfirm(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // Validate delivery confirmation
  TestValidator.equals(
    "confirmation belongs to correct customer",
    deliveryConfirmation.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "confirmation belongs to correct shipment",
    deliveryConfirmation.shipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "confirmed_at timestamp recorded",
    !!deliveryConfirmation.confirmed_at,
  );
  // Handle nullable properties safely
  if (deliveryConfirmation.shipment.shipment_status) {
    TestValidator.equals(
      "shipment status should be delivered",
      deliveryConfirmation.shipment.shipment_status,
      "delivered",
    );
  }
  if (
    deliveryConfirmation.shipment.delivered_at !== null &&
    deliveryConfirmation.shipment.delivered_at !== undefined
  ) {
    TestValidator.predicate(
      "delivered_at timestamp recorded",
      !!deliveryConfirmation.shipment.delivered_at,
    );
  }
  // Test unauthorized access attempt
  const unauthorizedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedCustomer = await authorize_customer_join(
    unauthorizedCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(unauthorizedCustomer);
  await TestValidator.error(
    "unauthorized customer cannot confirm delivery",
    async () => {
      await api.functional.ecommerce.customer.shipments.delivery_confirm.deliveryConfirm(
        unauthorizedCustomerConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
}
