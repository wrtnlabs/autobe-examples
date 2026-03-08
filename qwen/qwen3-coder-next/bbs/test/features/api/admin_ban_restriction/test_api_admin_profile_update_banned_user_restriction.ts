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

export async function test_api_admin_profile_update_banned_user_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const authorizedAdmin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: adminJoinData,
    },
  );
  typia.assert(authorizedAdmin);
  // 2. Update profile BEFORE banning (verify admin can update when active)
  const initialProfileUpdate = {
    display_name: "Active Admin User",
    bio: "Admin user for testing purposes",
  } satisfies IDiscussionBoardGuest.IUpdate;
  await api.functional.discussionBoard.admin.actors.update(adminConnection, {
    body: initialProfileUpdate,
  });
  // 3. Ban the admin
  const banData = {
    discussion_board_member_id: authorizedAdmin.id,
    ban_reason: "Testing ban functionality for admin users",
  } satisfies IDiscussionBoardBanRecord.IRequest;
  const banRecord =
    await api.functional.discussionBoard.admin.actors.ban.create(
      adminConnection,
      {
        body: banData,
      },
    );
  typia.assert(banRecord);
  // 4. Attempt to update profile AFTER banning (should fail if ban affects actor status)
  const bannedProfileUpdate = {
    display_name: "Banned Admin User",
    bio: "This should not be updated",
  } satisfies IDiscussionBoardGuest.IUpdate;
  await TestValidator.error("banned admin cannot update profile", async () => {
    await api.functional.discussionBoard.admin.actors.update(adminConnection, {
      body: bannedProfileUpdate,
    });
  });
}
