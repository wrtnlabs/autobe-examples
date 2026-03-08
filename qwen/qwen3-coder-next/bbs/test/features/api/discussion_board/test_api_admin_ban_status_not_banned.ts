import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_status_not_banned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin user
  const adminUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123!",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: adminUser,
  });
  typia.assert(authorized);
  // 2. Get ban status for the new admin user (who is not banned)
  const status =
    await api.functional.discussionBoard.admin.actors.ban.status(
      adminConnection,
    );
  typia.assert(status);
  // 3. Validate the ban status
  TestValidator.equals("is_banned should be false", status.is_banned, false);
  TestValidator.equals(
    "ban_reason should be undefined when not banned",
    status.ban_reason,
    undefined,
  );
  TestValidator.predicate(
    "banned_at should be a valid date-time string",
    () => {
      const date = new Date(status.banned_at);
      return !isNaN(date.getTime());
    },
  );
  TestValidator.equals(
    "unbanned_at should be null when not banned",
    status.unbanned_at,
    null,
  );
}
