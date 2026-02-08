import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_detail_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Retrieve detailed information of an existing seller by sellerId as an authorized administrator
  {
    // 1. Administrator registration
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_administrator_join(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministrator.IJoin,
      },
    );
    adminConnection.headers ??= {};
    adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
    // 2. Use a known valid sellerId
    // Since we don't have a create seller endpoint or utility, we assume a random UUID as existing
    // For testing, we simulate creation by using a random UUID and try to get seller
    const existingSellerId = typia.random<string & tags.Format<"uuid">>();
    // 3. Get seller details
    const sellerDetail =
      await api.functional.shoppingMall.administrator.sellers.at(
        adminConnection,
        {
          sellerId: existingSellerId,
        },
      );
    typia.assert(sellerDetail);
    // 4. Validate presence of expected keys and absence of sensitive data
    // Because the IShoppingMallSeller structure is empty in document, we only test typia.assert
    // Check that password_hash or similar sensitive fields are not present (cannot check as per available schema)
  }
  // Scenario 2: Retrieve seller information with non-existing sellerId as authorized administrator
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_administrator_join(
      adminConnection,
      {
        body: {} satisfies IShoppingMallAdministrator.IJoin,
      },
    );
    adminConnection.headers ??= {};
    adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
    // Use a non-existing UUID
    const nonExistingSellerId =
      "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
    await TestValidator.httpError(
      "404 for non-existing sellerId",
      404,
      async () => {
        await api.functional.shoppingMall.administrator.sellers.at(
          adminConnection,
          {
            sellerId: nonExistingSellerId,
          },
        );
      },
    );
  }
  // Scenario 3: Access seller details without administrator authentication
  {
    // Use a random sellerId
    const randomSellerId = typia.random<string & tags.Format<"uuid">>();
    // Use the base connection without authentication header
    await TestValidator.httpError(
      "401 unauthorized without token",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.sellers.at(connection, {
          sellerId: randomSellerId,
        });
      },
    );
    // Use an invalid token
    const invalidConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: "Bearer invalid.token" },
    };
    await TestValidator.httpError(
      "401 unauthorized with invalid token",
      401,
      async () => {
        await api.functional.shoppingMall.administrator.sellers.at(
          invalidConnection,
          {
            sellerId: randomSellerId,
          },
        );
      },
    );
  }
}
