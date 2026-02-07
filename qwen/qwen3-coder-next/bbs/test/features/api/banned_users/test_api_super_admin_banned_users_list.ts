import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_banned_users_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Authenticate super admin to get authorization token
  const authResult: IDiscussionBoardSuperAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(authResult);
  // Step 3: Retrieve banned users list with validated connection
  const bannedUsersResponse: IPageIDiscussionBoardBansBanRecord =
    await api.functional.discussionBoard.superAdmin.admin.banned_users.index(
      superAdminConnection,
    );
  typia.assert(bannedUsersResponse);
  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    bannedUsersResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    bannedUsersResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    bannedUsersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    bannedUsersResponse.pagination.pages >= 0,
  );
  // Step 5: Validate ban records array structure
  TestValidator.predicate(
    "has ban records array",
    Array.isArray(bannedUsersResponse.data),
  );
  // Step 6: Validate each ban record structure if records exist
  if (bannedUsersResponse.data.length > 0) {
    typia.assert(bannedUsersResponse.data[0]);
  } else {
    TestValidator.equals(
      "empty records when no banned users",
      bannedUsersResponse.data.length,
      0,
    );
  }
}
