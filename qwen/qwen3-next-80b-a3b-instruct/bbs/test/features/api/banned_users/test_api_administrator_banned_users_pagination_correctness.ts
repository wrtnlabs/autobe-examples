import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardCitizen";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_banned_users_pagination_correctness(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate administrator
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Create 3 administrator accounts (to appear in banned users list - scenario correction)
  const usersToBan = ArrayUtil.repeat(3, () => {
    return {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicBoardAdministrator.IJoin;
  });
  // Join the 3 users
  for (const user of usersToBan) {
    const userConn = { host: connection.host };
    await authorize_administrator_join(userConn, { body: user });
  }
  // 3. Retrieve banned users list (assumed to include our 3 admin accounts)
  const bannedUsersPage =
    await api.functional.economicBoard.administrator.admin.banned_users.index(
      adminConnection,
    );
  typia.assert(bannedUsersPage);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination records",
    bannedUsersPage.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination current",
    bannedUsersPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination pages",
    bannedUsersPage.pagination.pages > 0,
  );
  TestValidator.equals(
    "pagination limit",
    bannedUsersPage.pagination.limit,
    10,
  ); // default
  // 5. Validate data
  TestValidator.equals("banned users count", bannedUsersPage.data.length, 3);
  // 6. Validate each user has required properties
  for (const user of bannedUsersPage.data) {
    TestValidator.predicate("has id", Boolean(user.id));
    TestValidator.predicate("has email", Boolean(user.email));
    TestValidator.predicate("has created_at", Boolean(user.created_at));
    TestValidator.predicate(
      "email format",
      /^[^@]+@[^@]+\.[^@]+$/.test(user.email),
    );
    TestValidator.predicate(
      "created_at format",
      /^d{4}-d{2}-d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        user.created_at,
      ),
    );
  }
  // 7. Verify no duplicate IDs
  const userIDs = bannedUsersPage.data.map((u) => u.id);
  const uniqueUserIDs = [...new Set(userIDs)];
  TestValidator.equals(
    "no duplicate IDs",
    userIDs.length,
    uniqueUserIDs.length,
  );
}
