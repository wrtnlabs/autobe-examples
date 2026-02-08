import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBannedUser";
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

export async function test_api_administrator_banned_users_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Attach JWT access token to adminConnection headers
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuth.token.access}`;
  // 2. Request banned users list with empty filter
  const bannedUsersResponse: IPageIShoppingMallBannedUser.ISummary =
    await api.functional.shoppingMall.administrator.banned_users.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(bannedUsersResponse);
  // 3. Assert that data array is empty
  TestValidator.equals(
    "banned users data length",
    bannedUsersResponse.data.length,
    0,
  );
  // 4. Assert pagination metadata correctness
  TestValidator.equals(
    "pagination records",
    bannedUsersResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages",
    bannedUsersResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current is positive",
    bannedUsersResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    bannedUsersResponse.pagination.limit > 0,
  );
}
