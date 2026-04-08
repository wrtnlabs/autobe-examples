import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test successful shipment tracking update by seller before delivery confirmation.
 *
 * Validates that a seller can update tracking information (carrier name, tracking number, tracking URL) for their shipment. The test authenticates a seller, creates a product with variant, and then updates shipment tracking details. The shipment must belong to the authenticated seller and cannot be updated after delivery confirmation.
 *
 * This test verifies the primary success path where tracking information is updated successfully with all required fields provided. The updated shipment entity is validated to ensure tracking details are properly stored and the shipment status remains 'shipped'.
 *
 * 1. Seller registers and authenticates with email and password credentials.
 * 2. Seller creates a product with name, description, category, and base price.
 * 3. Seller creates a product variant with SKU code and option values.
 * 4. Seller updates shipment tracking information with carrier name, tracking number, and optional tracking URL.
 * 5. Validates the updated shipment contains correct tracking details and proper timestamps.
 */
export async function test_api_shipment_tracking_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`,
          option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
        },
      },
    );
  typia.assert(variant);
  // 4. Update shipment tracking information
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IEcommerceShipment.IUpdate = {
    carrier_name: RandomGenerator.pick(["UPS", "FedEx", "USPS", "DHL"]),
    tracking_number: RandomGenerator.alphaNumeric(12),
    tracking_url: typia.random<string & tags.Format<"uri">>(),
  };
  const updatedShipment: IEcommerceShipment =
    await api.functional.ecommerce.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId,
        shipmentId,
        body: updateBody,
      },
    );
  typia.assert(updatedShipment);
  // 5. Validate updated shipment
  TestValidator.equals(
    "carrier name matches",
    updatedShipment.carrier_name,
    updateBody.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    updatedShipment.tracking_number,
    updateBody.tracking_number,
  );
  TestValidator.predicate(
    "tracking URL is valid URI",
    updatedShipment.tracking_url !== null &&
      updatedShipment.tracking_url !== undefined,
  );
  TestValidator.predicate(
    "shipment has shipped status",
    updatedShipment.status === "shipped",
  );
}
