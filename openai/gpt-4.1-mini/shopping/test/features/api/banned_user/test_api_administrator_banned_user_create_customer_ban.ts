import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_banned_users_create } from "../../../generate/generate_random_shopping_mall_administrator_banned_users_create";
import { prepare_random_shopping_mall_banned_user } from "../../../prepare/prepare_random_shopping_mall_banned_user";

/**
 * Test creating a banned user as administrator with valid data to ban a customer
 */
export async function test_api_administrator_banned_user_create_customer_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator signup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        // Using an empty object as placeholder, assuming IShoppingMallAdministrator.IJoin is empty
      } satisfies IShoppingMallAdministrator.IJoin,
    });
  // Update adminConnection with Authorization header for subsequent requests
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 2. Create a banned user record for a customer
  // Prepare ban reason
  const banReason = "Violation of terms and conditions";
  // Create banned user with shoppingMallCustomerId set
  const bannedUserCustomer: IShoppingMallBannedUser =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallCustomerId: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          shoppingMallSellerId: null,
          banReason: banReason,
        } satisfies IShoppingMallBannedUser.ICreate,
      },
    );
  typia.assert(bannedUserCustomer);
  // Removed predicate checking nonexistent properties
  // Removed equals check for banReason property which does not exist
  // 3. Create a banned user record for a seller as edge case
  const bannedUserSeller: IShoppingMallBannedUser =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallCustomerId: null,
          shoppingMallSellerId: typia.random<
            string & import("typia").tags.Format<"uuid">
          >(),
          banReason: "Repeated policy violations",
        } satisfies IShoppingMallBannedUser.ICreate,
      },
    );
  typia.assert(bannedUserSeller);
  // Removed predicate checking nonexistent properties
}
