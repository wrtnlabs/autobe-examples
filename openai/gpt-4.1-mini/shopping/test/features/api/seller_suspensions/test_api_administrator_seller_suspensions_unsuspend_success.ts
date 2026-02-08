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

/**
 * Test administrator unsuspend seller success scenario.
 *
 * 1. Administrator joins and gets authorized.
 * 2. Administrator unsuspends a seller by sellerId.
 * 3. Verify the unsuspended seller record is returned and valid.
 */
export async function test_api_administrator_seller_suspensions_unsuspend_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility
  const adminAuthorized: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {} satisfies IShoppingMallAdministrator.IJoin, // empty join body as per DTO
    });
  // Set authorization header
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Call the unsuspend API endpoint with a random sellerId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const unsuspendedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.administrator.seller_suspensions.unsuspend(
      adminConnection,
      {
        sellerId,
      },
    );
  // 3. Validate the returned data structure
  typia.assert(unsuspendedSeller);
  // Additional validations can be business-specific but only schema-based validation mandated
}
