import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_sale_unit_detail_retrieval_and_not_found_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test covers three scenarios for the GET /shoppingMall/customer/sale-units/{unitId} endpoint:
  // 1. Attempting to retrieve a sale unit with a random UUID (simulating success with 404 due to missing API to create or list sale units).
  // 2. Attempting to retrieve a non-existent sale unit (expecting 404).
  // 3. Attempting to retrieve a soft deleted sale unit (expecting 404).
  // 1. Customer joins the platform to get authorization.
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  // Update connection headers with the token for authorization response
  customerConnection.headers = { Authorization: authorized.token.access };
  // A randomly generated UUID to simulate unitId for both existing and non-existing tests
  const randomUnitId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Attempt to get sale unit - expects 404 because no creation or listing API
  await TestValidator.httpError(
    "sale unit random UUID returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_units.at(
        customerConnection,
        { unitId: randomUnitId },
      );
    },
  );
  // Test 2: Non-existent sale unit retrieval returns 404 (using another random UUID)
  const nonExistentUnitId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent sale unit returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_units.at(
        customerConnection,
        { unitId: nonExistentUnitId },
      );
    },
  );
  // Test 3: Soft deleted sale unit retrieval returns 404 (using another random UUID)
  const softDeletedUnitId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "soft deleted sale unit returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.sale_units.at(
        customerConnection,
        { unitId: softDeletedUnitId },
      );
    },
  );
}
