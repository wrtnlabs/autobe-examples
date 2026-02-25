import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_seller_orders_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_shipment_creation_duplicate_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & typia.tags.Format<"uri">>(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  // 2. Generate two order IDs
  const orderId1 = typia.random<string & typia.tags.Format<"uuid">>();
  const orderId2 = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Generate unique tracking number
  const trackingNumber = RandomGenerator.alphaNumeric(20);
  const carrierName = RandomGenerator.name();
  const shippingCost = typia.random<number & typia.tags.Minimum<0>>();
  // 4. Create first shipment
  const shipment1 =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: orderId1 },
        body: {
          tracking_number: trackingNumber,
          carrier_name: carrierName,
          shipping_cost: shippingCost,
        },
      },
    );
  typia.assert(shipment1);
  TestValidator.equals(
    "tracking number matches",
    shipment1.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "carrier name matches",
    shipment1.carrier_name,
    carrierName,
  );
  // 5. Attempt duplicate tracking number on different order
  await TestValidator.error(
    "duplicate tracking number should fail",
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.create(
        sellerConnection,
        {
          orderId: orderId2,
          body: {
            tracking_number: trackingNumber,
            carrier_name: RandomGenerator.name(),
            shipping_cost: typia.random<number & typia.tags.Minimum<0>>(),
          } satisfies IEcommerceShipment.ICreate,
        },
      );
    },
  );
  // 6. Verify data integrity by checking first shipment still exists and unchanged
  TestValidator.equals(
    "original shipment tracking number",
    shipment1.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "original shipment carrier name",
    shipment1.carrier_name,
    carrierName,
  );
}
