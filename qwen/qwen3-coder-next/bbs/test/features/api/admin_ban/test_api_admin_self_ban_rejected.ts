import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_self_ban_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin account to use for self-ban attempt
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Test Admin",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Extract admin ID for self-ban attempt
  const adminId = admin.id;
  // Attempt to ban the admin with their own ID (self-ban attempt)
  await TestValidator.error("admin cannot ban themselves", async () => {
    await api.functional.discussionBoard.admin.actors.ban.create(
      adminConnection,
      {
        body: {
          discussion_board_member_id: adminId,
          ban_reason: "Trying to ban self",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  });
}
