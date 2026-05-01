import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that retrieving a non-existent seller session returns 404 Not Found.
 *
 * Validates the resource-not-found business logic: when an administrator queries for a seller session with a valid seller ID but a session ID that does not correspond to any session belonging to that seller, the endpoint returns a 404 response because no record satisfies both the seller_id and session_id conditions simultaneously.
 *
 * 1. Administrator registers and authenticates to gain admin-level access.
 * 2. Seller registers on the platform to provide a valid seller ID context.
 * 3. Administrator attempts to retrieve a session using the valid seller's ID and a randomly generated, non-existent session ID.
 * 4. Validates that the endpoint returns a 404 Not Found error.
 */
export async function test_api_seller_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup — obtain valid seller ID
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Attempt to retrieve session with non-existent session ID
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 when session not found for seller",
    404,
    async () =>
      await api.functional.shoppingMall.admin.sellers.sessions.at(
        adminConnection,
        {
          sellerId: seller.id,
          sessionId: fakeSessionId,
        },
      ),
  );
}
