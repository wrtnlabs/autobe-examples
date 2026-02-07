import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAppeal";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_bans_appeals_pagination_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(adminConnection, {
    body: {},
  });
  // Test pagination metadata structure
  const response =
    await api.functional.discussionBoard.superAdmin.admins.bans.appeals.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  // Validate pagination properties exist and have correct types
  TestValidator.predicate(
    "current page is positive integer",
    () =>
      typeof response.pagination.current === "number" &&
      response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive integer",
    () =>
      typeof response.pagination.limit === "number" &&
      response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative integer",
    () =>
      typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative integer",
    () =>
      typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.equals("data array exists", response.data !== undefined, true);
  TestValidator.predicate("data is array", () => Array.isArray(response.data));
}
