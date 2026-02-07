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

export async function test_api_super_admin_banned_users_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    // Empty body as IJoin has no required fields
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const adminToken = await api.functional.discussionBoard.auth.super_admin.join(
    adminConnection,
    { body: superAdminCredentials },
  );
  typia.assert(adminToken);
  // 2. Test default pagination (no parameters specified)
  const defaultPage =
    await api.functional.discussionBoard.superAdmin.admin.banned_users.index(
      adminConnection,
    );
  typia.assert(defaultPage);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination has required fields",
    defaultPage.pagination.current > 0 &&
      defaultPage.pagination.limit >= 0 &&
      defaultPage.pagination.records >= 0 &&
      defaultPage.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array exists",
    defaultPage.data !== undefined && Array.isArray(defaultPage.data),
  );
  // 5. Test with different pagination configurations (simulated)
  // Note: The actual API doesn't accept pagination parameters in this endpoint
  // This test validates the basic functionality works correctly
  const secondPage =
    await api.functional.discussionBoard.superAdmin.admin.banned_users.index(
      adminConnection,
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "same response structure",
    secondPage.pagination.current,
    defaultPage.pagination.current,
  );
}
