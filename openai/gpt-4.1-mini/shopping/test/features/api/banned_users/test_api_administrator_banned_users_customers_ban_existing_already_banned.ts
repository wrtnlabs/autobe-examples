import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_administrator_banned_users_customers_ban_existing_already_banned(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to ban a customer user who is already banned.
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@test.com",
        password: "password123",
      },
    },
  );
  typia.assert(adminJoinResponse);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminJoinResponse.token.access}`;
  // 2. Create a banned user record for a random customer
  // Generate random customer ID for the ban
  const initialBan =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shoppingMallCustomerId: typia.random<string & tags.Format<"uuid">>(),
          banReason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(initialBan);
  if (!initialBan.customer?.id)
    throw new Error("bannedUser.customer.id must be defined");
  // 3. Attempt to ban the same customer again
  const secondBanResponse =
    await api.functional.shoppingMall.administrator.banned_users.customers.ban.banCustomer(
      adminConnection,
      {
        customerId: initialBan.customer.id,
      },
    );
  typia.assert(secondBanResponse);
  // 4. Validate the second ban response equals the first
  TestValidator.equals(
    "duplicate ban returns existing record",
    secondBanResponse,
    initialBan,
  );
  // 5. Verify no duplicate banned user record created
  // Note: We cannot directly test DB here; response equality suffices for E2E
  // 6. Audit logs and login restriction assumed verified elsewhere
}
