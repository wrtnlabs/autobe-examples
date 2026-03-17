import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_list_other_seller_scope_hidden(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const foreignShipmentId = typia.random<string & tags.Format<"uuid">>();
  const foreignOrderId = typia.random<string & tags.Format<"uuid">>();
  const foreignOrderCode = `order-${RandomGenerator.alphaNumeric(12)}`;
  const attempts = [
    {
      title: "foreign shipment id is hidden",
      body: {
        id: foreignShipmentId,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
    {
      title: "foreign order id is hidden",
      body: {
        shopping_mall_order_id: foreignOrderId,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
    {
      title: "foreign order code is hidden",
      body: {
        orderCode: foreignOrderCode,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  ] as const;
  for (const attempt of attempts) {
    try {
      const page = await api.functional.shoppingMall.seller.shipments.index(
        sellerConnection,
        {
          body: attempt.body,
        },
      );
      typia.assert(page);
      TestValidator.equals(
        `${attempt.title} returns no visible shipments`,
        page.data.length,
        0,
      );
    } catch (exp) {
      typia.assertGuard<api.HttpError>(exp);
      TestValidator.predicate(
        `${attempt.title} rejects with protected-scope status`,
        exp.status === 401 || exp.status === 403 || exp.status === 404,
      );
    }
  }
}
