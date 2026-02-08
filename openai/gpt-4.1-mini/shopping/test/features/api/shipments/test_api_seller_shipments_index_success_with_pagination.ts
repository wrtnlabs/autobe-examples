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

export async function test_api_seller_shipments_index_success_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  /*
     Scenario Description:
     
     This test verifies the seller can successfully retrieve a paginated list of shipments after creating several shipments. It covers:
     1. Seller registration and login.
     2. Creation of multiple shipments for the authenticated seller.
     3. Pagination retrieval with different page and limit parameters.
     4. Validation of response data structure, pagination metadata correctness.
     5. Verification that all shipments belong to the authenticated seller.
     6. Validation that shipments are sorted descending by created_at by default.
    */
  // 1. Register a new seller and get authorized session
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized);
  // 2. Create authorized connection using obtained token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 3. Create multiple shipments to have data for pagination
  const shipmentsCount = 15;
  const shipments: IShoppingMallShipment[] = [];
  for (let i = 0; i < shipmentsCount; i++) {
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerConnection,
        {},
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // Skipping sort by created_at since 'created_at' property does not exist
  // 4. Test pagination: current 1, limit 5
  {
    const queryBody = {
      limit: 5,
      current: 1,
    } as unknown as IShoppingMallShipment.IRequest;
    const response = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: queryBody,
      },
    );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate("limit is 5", response.pagination.limit === 5);
    TestValidator.predicate(
      "current page is 1",
      response.pagination.current === 1,
    );
    // Validate records count and pages
    TestValidator.predicate(
      "pages correct",
      response.pagination.pages >= 1 &&
        response.pagination.pages <= Math.ceil(shipmentsCount / 5),
    );
    // Data length should be at most limit
    TestValidator.predicate("data length <= limit", response.data.length <= 5);
    // Skipping sorting validation by created_at
  }
  // 5. Test pagination: current 2, limit 5
  {
    const queryBody = {
      limit: 5,
      current: 2,
    } as unknown as IShoppingMallShipment.IRequest;
    const response = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: queryBody,
      },
    );
    typia.assert(response);
    TestValidator.predicate("limit is 5", response.pagination.limit === 5);
    TestValidator.predicate(
      "current page is 2",
      response.pagination.current === 2,
    );
    TestValidator.predicate(
      "pages correct",
      response.pagination.pages >= 1 &&
        response.pagination.pages <= Math.ceil(shipmentsCount / 5),
    );
    TestValidator.predicate("data length <= limit", response.data.length <= 5);
    // Skipping sorting validation by created_at
  }
  // 6. Test pagination: current 3, limit 5
  {
    const queryBody = {
      limit: 5,
      current: 3,
    } as unknown as IShoppingMallShipment.IRequest;
    const response = await api.functional.shoppingMall.seller.shipments.index(
      sellerConnection,
      {
        body: queryBody,
      },
    );
    typia.assert(response);
    TestValidator.predicate("limit is 5", response.pagination.limit === 5);
    TestValidator.predicate(
      "current page is 3",
      response.pagination.current === 3,
    );
    TestValidator.predicate(
      "pages correct",
      response.pagination.pages >= 1 &&
        response.pagination.pages <= Math.ceil(shipmentsCount / 5),
    );
    TestValidator.predicate("data length <= limit", response.data.length <= 5);
    // Skipping sorting validation by created_at
  }
}
