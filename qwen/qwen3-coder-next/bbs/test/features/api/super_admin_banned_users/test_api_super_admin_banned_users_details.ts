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

export async function test_api_super_admin_banned_users_details(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate super admin (join handles authentication internally)
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Get banned users list (authenticated via join)
  const result: IPageIDiscussionBoardBansBanRecord =
    await api.functional.discussionBoard.superAdmin.admin.banned_users.index(
      superAdminConnection,
    );
  // Validate response structure
  typia.assert(result);
  typia.assert(result.pagination);
  // Verify pagination properties exist and have correct types
  TestValidator.predicate(
    "pagination has current page",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has record count",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof result.pagination.pages === "number",
  );
  // Verify data array structure
  TestValidator.predicate("result has data array", Array.isArray(result.data));
  // Verify each ban record has expected structure
  result.data.forEach((record, index) => {
    TestValidator.predicate(
      `ban record ${index} is object`,
      typeof record === "object",
    );
  });
}
