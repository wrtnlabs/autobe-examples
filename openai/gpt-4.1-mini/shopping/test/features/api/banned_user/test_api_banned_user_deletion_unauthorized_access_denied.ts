import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_banned_user_deletion_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies unauthorized deletion is rejected
  // Create administrator connection and authorize join (precondition)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin has no fields to fill
  }); // Should provide authentication tokens for admin
  // Prepare a random UUID for bannedUserId
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // Create unauthorized connections
  // Case 1: No authentication
  const noAuthConnection: api.IConnection = { host: connection.host };
  // Try to delete bannedUserId with no authentication
  await TestValidator.httpError(
    "reject banned user deletion without auth",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.banned_users.erase(
        noAuthConnection,
        {
          bannedUserId,
        },
      );
    },
  );
  // Case 2: Simulate a customer connection with no admin token
  // Since no utility function provided for customer login, just simulate no auth
  const customerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reject banned user deletion with customer role",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.banned_users.erase(
        customerConnection,
        {
          bannedUserId,
        },
      );
    },
  );
  // Case 3: Simulate a seller connection with no admin token
  // Since no utility function provided for seller login, simulate no auth
  const sellerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reject banned user deletion with seller role",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.banned_users.erase(
        sellerConnection,
        {
          bannedUserId,
        },
      );
    },
  );
}
