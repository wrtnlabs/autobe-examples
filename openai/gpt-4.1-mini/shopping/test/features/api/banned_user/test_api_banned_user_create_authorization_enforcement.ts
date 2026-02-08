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

export async function test_api_banned_user_create_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized users cannot create banned user records
  // Attempt to create banned user without administrator authentication
  await TestValidator.httpError(
    "Create banned user without admin auth should fail",
    [401, 403],
    async () => {
      const guestConnection: api.IConnection = { host: connection.host };
      // Create a dummy banned user create body with minimal mock data
      // (Note: IShoppingMallBannedUser.ICreate has no defined properties, so empty object)
      const body = {} satisfies IShoppingMallBannedUser.ICreate;
      await api.functional.shoppingMall.administrator.banned_users.create(
        guestConnection,
        { body },
      );
    },
  );
  // Additional tests could verify admin with insufficient permissions if applicable
  // Since no permission levels detail is provided, this is skipped
}
