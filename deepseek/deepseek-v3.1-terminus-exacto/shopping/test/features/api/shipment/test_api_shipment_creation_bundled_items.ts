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

export async function test_api_shipment_creation_bundled_items(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate as seller through join
  const seller = await authorize_seller_join(sellerConnection, {
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
  typia.assert(seller);
  // Create shipment with tracking information
  const carriers = ["UPS", "FedEx", "DHL", "USPS"] as const;
  const shipment =
    await generate_random_ecommerce_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          tracking_number: RandomGenerator.alphaNumeric(16),
          carrier_name: RandomGenerator.pick(carriers),
          shipping_cost: typia.random<number & tags.Minimum<0>>(),
        } satisfies IEcommerceShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Validate core shipment properties
  TestValidator.equals(
    "shipment status should be 'created'",
    shipment.shipment_status,
    "created",
  );
  TestValidator.equals(
    "seller ID should match authenticated seller",
    shipment.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email should match",
    shipment.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "shop name should match",
    shipment.seller.shop_name,
    seller.shop_name,
  );
}
