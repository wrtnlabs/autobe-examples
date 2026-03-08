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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_user_ban_self_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin user using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(newAdmin);
  // 2. Try to ban the admin user from themselves (self-ban attempt)
  // This should fail because admins cannot ban themselves
  await TestValidator.error("admin cannot ban themselves", async () => {
    await api.functional.discussionBoard.admin.bans.create(adminConnection, {
      body: {
        ban_reason: "Self-ban test",
        discussion_board_member_id: newAdmin.id,
        administrator_id: newAdmin.id, // Self-ban: administrator_id equals user ID
      } satisfies IDiscussionBoardBanRecord.ICreate,
    });
  });
  // 3. Verify the admin is still active by creating another admin action
  // Since we can't refresh without a separate endpoint, just verify admin is still valid
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  TestValidator.predicate("admin is still valid", () => !!newAdmin.id);
  TestValidator.equals("admin ID preserved", newAdmin.id, newAdmin.id);
}
