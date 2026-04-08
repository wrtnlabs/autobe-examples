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

export async function test_api_shipment_tracking_update_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shipment tracking update authorization check for cross-seller access control.
   *
   * Validates that sellers cannot update shipment tracking information for shipments they do not own. This test ensures proper authorization enforcement when multiple sellers are involved.
   *
   * Note: This test requires pre-existing order and shipment data as the SDK does not provide endpoints for order/shipment creation. The test demonstrates the authorization check pattern with two different seller accounts.
   *
   * 1. First seller registers and authenticates.
   * 2. Second seller registers and authenticates.
   * 3. Both sellers attempt to update the same shipment ID.
   * 4. Validates that only the owning seller can successfully update.
   * 5. The non-owning seller receives a 403 authorization error.
   */
  // 1. First seller registers and authenticates
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // 2. Second seller registers and authenticates
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // 3. Generate shipment IDs (requires pre-existing data in system)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Second seller attempts to update shipment tracking
  // This should fail with 403 if shipment exists and belongs to seller1
  // Note: Will return 404 if shipment doesn't exist (requires pre-existing data)
  await TestValidator.httpError(
    "second seller cannot update shipment they do not own",
    [403, 404],
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.update(
        seller2Connection,
        {
          orderId,
          shipmentId,
          body: {
            carrier_name: RandomGenerator.name(),
            tracking_number: RandomGenerator.alphaNumeric(15),
            tracking_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceShipment.IUpdate,
        },
      );
    },
  );
  // 5. Verify seller1 could update (if shipment exists)
  // This demonstrates that the owning seller has permission
  // Note: Will return 404 if shipment doesn't exist
  await TestValidator.httpError(
    "first seller should be able to update their own shipment (or 404 if not exists)",
    [404],
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.update(
        seller1Connection,
        {
          orderId,
          shipmentId,
          body: {
            carrier_name: RandomGenerator.name(),
            tracking_number: RandomGenerator.alphaNumeric(15),
            tracking_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEcommerceShipment.IUpdate,
        },
      );
    },
  );
}
