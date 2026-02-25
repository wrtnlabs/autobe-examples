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

/**
 * Test security validation by attempting to confirm delivery of a shipment that does not contain the customer's order items.
 * Create two separate customers and seller accounts. Customer A purchases items from Seller A, Seller A creates shipment.
 * Customer B attempts to confirm delivery of Customer A's shipment. The system should reject the unauthorized access attempt
 * with appropriate error response, preventing customers from confirming delivery of shipments containing other customers' items.
 * Validate that the shipment status remains unchanged and no delivery confirmation record is created for the unauthorized attempt.
 */
export async function test_api_customer_delivery_confirmation_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create Seller A connection
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // Create Customer A connection
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // Create Customer B connection
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // Seller A creates a product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<200>
        >(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<5000>
        >(),
        base_price: typia.random<number & tags.Minimum<0>>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller A creates product variant
  const variant =
    await api.functional.ecommerce.seller.products.variants.create(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          sku: typia.random<
            string & tags.MinLength<3> & tags.MaxLength<50>
          >(),
          option_values: JSON.stringify({ color: "red", size: "medium" }),
          price_override: null,
          quantity: 10,
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Seller A adds inventory
  const inventory =
    await api.functional.ecommerce.seller.products.variants.inventory.updateInventory(
      sellerAConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: 10,
          reason: "initial_stock",
        } satisfies IEcommerceProductVariant.IInventoryChange,
      },
    );
  typia.assert(inventory);
  // Customer A creates shopping cart
  const carts = await api.functional.ecommerce.customer.carts.index(
    customerAConnection,
    {
      body: {
        customer_id: customerA.id,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(carts);
  const cartId = carts.data[0]?.id;
  if (!cartId) {
    throw new Error("Failed to create shopping cart");
  }
  // Customer A adds item to cart
  const cartItem = await api.functional.ecommerce.customer.carts.items.create(
    customerAConnection,
    {
      cartId: cartId,
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Customer A completes checkout
  const order = await api.functional.ecommerce.customer.checkout.create(
    customerAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(order);
  // Seller A creates shipment for Customer A's order
  const shipment = await api.functional.ecommerce.seller.shipments.create(
    sellerAConnection,
    {
      body: {
        tracking_number:
          "TRACK-" +
          typia.random<string & tags.Format<"uuid">>().substring(0, 10),
        carrier_name: "Test Carrier",
        shipping_cost: 500,
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Validate shipment status before unauthorized attempt
  TestValidator.equals(
    "shipment has no delivery timestamp initially",
    shipment.delivered_at,
    null,
  );
  // Customer B attempts unauthorized delivery confirmation
  await TestValidator.error(
    "Customer B cannot confirm delivery of Customer A's shipment",
    async () => {
      await api.functional.ecommerce.customer.shipments.delivery_confirm.deliveryConfirm(
        customerBConnection,
        {
          shipmentId: shipment.id,
        },
      );
    },
  );
  // Verify shipment status remains unchanged after unauthorized attempt
  const shipments = await api.functional.ecommerce.seller.shipments.create(
    sellerAConnection,
    {
      body: {
        tracking_number:
          "TRACK-" +
          typia.random<string & tags.Format<"uuid">>().substring(0, 10),
        carrier_name: "Test Carrier",
        shipping_cost: 500,
      } satisfies IEcommerceShipment.ICreate,
    },
  );
  typia.assert(shipments);
  TestValidator.equals(
    "shipment delivery status remains unchanged after unauthorized attempt",
    shipments.delivered_at,
    null,
  );
}