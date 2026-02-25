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
import { generate_random_ecommerce_seller_shipments_create } from "../../../generate/generate_random_ecommerce_seller_shipments_create";
import { prepare_random_ecommerce_shipment } from "../../../prepare/prepare_random_ecommerce_shipment";

export async function test_api_shipment_creation_with_shipping_cost(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create shipment with shipping cost
  const shippingCost = typia.random<number & tags.Minimum<0>>();
  const shipment = await generate_random_ecommerce_seller_shipments_create(
    sellerConnection,
    {
      body: {
        tracking_number: RandomGenerator.alphaNumeric(12),
        carrier_name: RandomGenerator.name(),
        shipping_cost: shippingCost satisfies number | null as number,
      },
    },
  );
  typia.assert(shipment);
  // 3. Validate shipping cost is correctly stored
  TestValidator.equals(
    "shipping cost matches input",
    shipment.shipping_cost,
    shippingCost,
  );
  TestValidator.predicate(
    "shipping cost is included in response",
    shipment.shipping_cost !== undefined && shipment.shipping_cost !== null,
  );
  // Additional business validation: shipping cost should be non-negative when present
  if (shipment.shipping_cost !== null && shipment.shipping_cost !== undefined) {
    TestValidator.predicate(
      "shipping cost is non-negative",
      shipment.shipping_cost >= 0,
    );
  }
  // 4. Validate seller association
  TestValidator.predicate(
    "shipment has seller information",
    shipment.seller !== undefined,
  );
  typia.assert(shipment.seller);
}
