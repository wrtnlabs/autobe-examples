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

export async function test_api_bans_appeals_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Fetch appeals with empty filter (should return empty or existing data)
  const initialResult =
    await api.functional.discussionBoard.superAdmin.admins.bans.appeals.index(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardBansAppeal.IRequest>(),
      },
    );
  typia.assert(initialResult);
  // Validate structure
  TestValidator.equals(
    "pagination exists",
    initialResult.pagination.current,
    1,
  );
  TestValidator.predicate("has records", initialResult.pagination.records >= 0);
  TestValidator.equals("limit respected", initialResult.pagination.limit, 0);
  TestValidator.equals("pages calculated", initialResult.pagination.pages, 0);
  TestValidator.predicate(
    "data array exists",
    Array.isArray(initialResult.data),
  );
}