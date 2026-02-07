import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_banned_users_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account (automatically updates connection with auth token)
  const superAdminAuth =
    await api.functional.discussionBoard.auth.super_admin.join(connection, {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    });
  typia.assert(superAdminAuth);
  // Retrieve banned users list using the authenticated connection
  const bans =
    await api.functional.discussionBoard.superAdmin.admins.bans.index(
      connection,
    );
  typia.assert(bans);
  // Validate response structure (ISummary is empty, so just validate it's an object)
  TestValidator.predicate(
    "valid ban record structure",
    typeof bans === "object",
  );
}
