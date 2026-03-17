import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_retrieval_other_seller_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller A and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create shipment for seller A
  const sellerAShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerAConnection,
      {
        body: {
          order_item_ids: ArrayUtil.repeat(3, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          carrier_name: null,
        },
      },
    );
  typia.assert(sellerAShipment);
  // 3. Create seller B and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller456!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create shipment for seller B
  const sellerBShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerBConnection,
      {
        body: {
          order_item_ids: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          carrier_name: null,
        },
      },
    );
  typia.assert(sellerBShipment);
  // 5. Test: Seller B retrieves their own shipment (should succeed)
  const sellerBOwnShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerBConnection, {
      shipmentId: sellerBShipment.id,
    });
  typia.assert(sellerBOwnShipment);
  // 6. Test: Seller B attempts to retrieve seller A's shipment (should return 404)
  await TestValidator.httpError(
    "seller B cannot access seller A's shipment",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.shipments.at(
        sellerBConnection,
        {
          shipmentId: sellerAShipment.id,
        },
      );
    },
  );
}
