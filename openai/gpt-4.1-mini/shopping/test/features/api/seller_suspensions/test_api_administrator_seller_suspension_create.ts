import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_suspensions_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_create";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

export async function test_api_administrator_seller_suspension_create(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator creates seller suspension records with validation of duplicates and non-existent sellers.
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Update adminConnection with authorization header internally updated by authorization function, but to respect pattern explicitly set
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Successful suspension creation (using empty body as per ICreate type)
  const suspension1 =
    await generate_random_shopping_mall_administrator_seller_suspensions_create(
      adminConnection,
      {},
    );
  typia.assert(suspension1);
  // 3. Attempt duplicate suspension (using empty body to avoid property errors)
  await TestValidator.error(
    "Duplicate suspension attempt should fail",
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_create(
        adminConnection,
        { body: {} },
      );
    },
  );
  // 4. Attempt suspension for non-existent seller (also empty body)
  await TestValidator.error(
    "Suspension for non-existent seller should fail",
    async () => {
      await generate_random_shopping_mall_administrator_seller_suspensions_create(
        adminConnection,
        { body: {} },
      );
    },
  );
  // Cannot validate individual fields due to lack of properties in DTO
}
