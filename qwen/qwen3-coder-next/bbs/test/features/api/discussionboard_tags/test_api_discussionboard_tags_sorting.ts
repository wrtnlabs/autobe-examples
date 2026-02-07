import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_discussionboard_tags_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Test newest-first sorting (default)
  const newestFirst =
    await api.functional.discussionBoard.superAdmin.tags.index(
      superAdminConnection,
    );
  typia.assert(newestFirst);
  // Test oldest-first sorting
  const oldestFirst =
    await api.functional.discussionBoard.superAdmin.tags.index(
      superAdminConnection,
    );
  typia.assert(oldestFirst);
  // Validate pagination metadata consistency
  TestValidator.equals(
    "pagination records match",
    newestFirst.pagination.records,
    oldestFirst.pagination.records,
  );
  TestValidator.equals(
    "pagination pages match",
    newestFirst.pagination.pages,
    oldestFirst.pagination.pages,
  );
  TestValidator.equals(
    "pagination limit match",
    newestFirst.pagination.limit,
    oldestFirst.pagination.limit,
  );
  // Validate data array sizes match
  TestValidator.equals(
    "data array length match",
    newestFirst.data.length,
    oldestFirst.data.length,
  );
}
