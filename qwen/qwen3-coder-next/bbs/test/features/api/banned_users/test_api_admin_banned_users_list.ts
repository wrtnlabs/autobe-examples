import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Call banned users list endpoint with authenticated admin connection
  const bannedUsers =
    await api.functional.discussionBoard.admin.admin.banned_users.index(
      adminConnection,
    );
  // Validate response structure
  typia.assert(bannedUsers);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    bannedUsers.pagination !== undefined,
  );
  TestValidator.predicate(
    "ban records array exists",
    bannedUsers.data !== undefined,
  );
  TestValidator.predicate(
    "ban records is array",
    Array.isArray(bannedUsers.data),
  );
  // Validate pagination properties
  TestValidator.predicate(
    "current page is positive",
    bannedUsers.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive",
    bannedUsers.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    bannedUsers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    bannedUsers.pagination.pages >= 0,
  );
}
