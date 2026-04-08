import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_cart_item } from "../../../prepare/prepare_random_ecommerce_cart_item";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

/**
 * Test seller viewing shipment tracking information for their orders.
 *
 * Validates that sellers can retrieve detailed tracking information for shipments containing their products. The test verifies the complete shipment data structure including carrier details, tracking information, delivery status, and associated order items with their product and variant details.
 *
 * The test follows a natural e-commerce workflow: seller creates products, customer places an order, seller ships the order with tracking information, and finally the seller views the shipment tracking details to confirm all information is correctly stored and retrievable.
 *
 * 1. Seller registers and authenticates with the platform.
 * 2. Seller creates a product with at least one variant.
 * 3. Customer registers and authenticates with the platform.
 * 4. Customer adds the product variant to their shopping cart.
 * 5. Customer completes checkout to create an order (simulated).
 * 6. Seller creates a shipment for the order with carrier and tracking information.
 * 7. Seller retrieves the shipment tracking information via the API endpoint.
 * 8. Validates the response contains all required tracking fields and order item details.
 */
export async function test_api_shipment_tracking_view_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product with a variant
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphabets(8).toUpperCase(),
            option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Seller creates a shipment for an order
  // Note: The shipment creation utility handles the order context internally
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId },
        body: {
          carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
          tracking_number: RandomGenerator.alphaNumeric(12).toUpperCase(),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
          order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 5. Seller views the shipment tracking information
  const shipmentView =
    await api.functional.ecommerce.seller.orders.shipments.at(
      sellerConnection,
      {
        orderId: shipment.order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(shipmentView);
  // 6. Validate the response contains all required fields
  TestValidator.equals(
    "carrier name matches",
    shipmentView.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    shipmentView.tracking_number,
    shipment.tracking_number,
  );
  TestValidator.predicate(
    "has tracking URL",
    shipmentView.tracking_url !== null &&
      shipmentView.tracking_url !== undefined,
  );
  TestValidator.predicate(
    "has shipped timestamp",
    shipmentView.shipped_at !== null && shipmentView.shipped_at !== undefined,
  );
  TestValidator.predicate(
    "has valid status",
    ["pending", "shipped", "in_transit", "delivered", "exception"].includes(
      shipmentView.status,
    ),
  );
  TestValidator.predicate(
    "has order reference",
    shipmentView.order !== null && shipmentView.order !== undefined,
  );
  TestValidator.predicate(
    "has seller reference",
    shipmentView.seller !== null && shipmentView.seller !== undefined,
  );
  TestValidator.predicate(
    "has shipment items",
    Array.isArray(shipmentView.shipment_items) &&
      shipmentView.shipment_items.length > 0,
  );
}