import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_index_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Test each status filter to verify filtering works correctly
  const statusList = [
    "pending",
    "shipped",
    "in_transit",
    "delivered",
    "cancelled",
  ] as const;
  for (const status of statusList) {
    const response = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          status: status,
          limit: 100,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
    typia.assert(response);
    // Validate that all returned shipments match the requested status
    for (const shipment of response.data) {
      TestValidator.equals(
        `shipment ${shipment.id} has correct status ${status}`,
        shipment.status,
        status,
      );
    }
    // Validate pagination structure
    TestValidator.predicate(
      `pagination is valid for status ${status}`,
      () =>
        response.pagination.current >= 1 &&
        response.pagination.limit >= 1 &&
        response.pagination.records >= 0 &&
        response.pagination.pages >= 0,
    );
  }
  // Test combined filters (status + tracking number)
  const combinedFilterResponse =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        tracking_number: "",
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(combinedFilterResponse);
  // Test no results when filter doesn't match
  const noResultsResponse =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        status: "pending",
        tracking_number: "nonexistent-tracking-123",
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "no results when tracking number not found",
    noResultsResponse.data.length,
    0,
  );
}
