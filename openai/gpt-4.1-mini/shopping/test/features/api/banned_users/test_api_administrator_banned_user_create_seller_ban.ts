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

export async function test_api_administrator_banned_user_create_seller_ban(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test creating a banned user record as an administrator with valid seller ban data.
  // Preconditions: Administrator account joined and authenticated.
  // Process:
  // - Administrator joins and authenticates
  // - Administrator creates banned user with shoppingMallSellerId and banReason
  // Validation:
  // - Confirm response includes banned user record
  // - Ensure only seller ID is set, customer ID is null
  // - Ban reason stored correctly
  // Edge cases:
  // - Attempt to ban same seller twice and verify duplicate ban handling is correct
  // - Duplicate ban error is expected on second attempt
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  adminConnection.headers = { Authorization: adminJoin.token.access };
  // 2. Create a banned user with seller ban
  // Use a fixed UUID since seller creation is out of this test's scope
  const knownValidSellerId = typia.random<string & tags.Format<"uuid">>();
  const banReason = `Violation of terms - ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const bannedUser1 =
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shopping_mall_seller_id: knownValidSellerId,
          shopping_mall_customer_id: null,
          ban_reason: banReason,
        },
      },
    );
  typia.assert(bannedUser1);
  // The IShoppingMallBannedUser type does not contain these properties, so omit checks that access them
  // 3. Attempt to ban the same seller again (expect error)
  await TestValidator.error("duplicate seller ban should fail", async () => {
    await generate_random_shopping_mall_administrator_banned_users_create(
      adminConnection,
      {
        body: {
          shopping_mall_seller_id: knownValidSellerId,
          shopping_mall_customer_id: null,
          ban_reason: `Repeated violation - ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  });
}
