import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";

export async function test_api_administrator_banned_users_sellers_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // Prepare a valid sellerId UUID for testing ban endpoint
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare ban request body (empty object) as IBanCreate has no properties
  const banBody: IShoppingMallBannedUser.IBanCreate = {};
  // 2. Attempt to ban an existing active seller using the ban endpoint
  const response =
    await api.functional.shoppingMall.administrator.banned_users.sellers.ban(
      adminConnection,
      {
        sellerId,
        body: banBody,
      },
    );
  // 3. Validate the response by asserting its structure
  typia.assert(response);
  // 4. Additional validation of the response properties is omitted due to absence of those properties
}
