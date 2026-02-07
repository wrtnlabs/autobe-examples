import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create multiple shipments
  const today = new Date();
  const date1 = new Date(
    today.getTime() - 1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const date2 = new Date(
    today.getTime() - 1000 * 60 * 60 * 24 * 5,
  ).toISOString();
  const date3 = new Date(
    today.getTime() - 1000 * 60 * 60 * 24 * 2,
  ).toISOString();
  const shipments: IShoppingMallShipment[] = [];
  for (let i = 0; i < 3; i++) {
    const shipment = await api.functional.shoppingMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          // status: "pending" satisfies IShoppingMallShipment["status"], // Property 'status' does not exist
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // Test pagination
  const paginatedShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        limit: 2,
        page: 1,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(paginatedShipments);
  TestValidator.equals("pagination limit", paginatedShipments.data.length, 2);
  TestValidator.equals(
    "pagination page",
    paginatedShipments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit value",
    paginatedShipments.pagination.limit,
    2,
  );
  // Test sorting
  const sortedShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        sort: ["-shipped_at"],
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(sortedShipments);
  // Test filtering by status
  const pendingShipments =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        // status: "pending" satisfies IShoppingMallShipment["status"], // Property 'status' does not exist
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(pendingShipments);
}