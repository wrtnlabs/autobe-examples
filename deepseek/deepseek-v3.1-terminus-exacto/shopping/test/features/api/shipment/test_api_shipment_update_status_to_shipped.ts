import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_update_status_to_shipped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection properly
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. First need to create shipments using the index endpoint as per dependency
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // Initial shipment creation with 'created' status
  const shipmentCreate =
    await api.functional.ecommerce.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
        body: {
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
          shipment_status: "created",
        } satisfies IEcommerceShipment.IUpdate,
      },
    );
  typia.assert(shipmentCreate);
  TestValidator.equals(
    "initial status is created",
    shipmentCreate.shipment_status,
    "created",
  );
  // 3. Update shipment status to 'shipped' with timestamp
  const shippedAt = new Date().toISOString();
  const updatedShipment =
    await api.functional.ecommerce.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
        body: {
          shipment_status: "shipped",
          carrier_name: shipmentCreate.carrier_name,
          tracking_number: shipmentCreate.tracking_number,
        } satisfies IEcommerceShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // 4. Validate shipment status update
  TestValidator.equals(
    "status updated to shipped",
    updatedShipment.shipment_status,
    "shipped",
  );
  TestValidator.equals(
    "carrier name unchanged",
    updatedShipment.carrier_name,
    shipmentCreate.carrier_name,
  );
  TestValidator.equals(
    "tracking number unchanged",
    updatedShipment.tracking_number,
    shipmentCreate.tracking_number,
  );
  TestValidator.predicate(
    "seller information preserved",
    updatedShipment.seller.id === sellerAuth.id,
  );
}
