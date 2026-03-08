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

export async function test_api_admin_unban_record_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678" satisfies string &
        tags.MinLength<8> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a ban record
  const userToBan = typia.random<string & tags.Format<"uuid">>();
  const adminUser = typia.random<string & tags.Format<"uuid">>();
  const banCreate = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        discussion_board_member_id: userToBan,
        administrator_id: adminUser,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banCreate);
  // 3. Unban the user
  const unbanReason = RandomGenerator.paragraph({ sentences: 2 });
  const unbanResult = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: banCreate.id,
      body: {
        ban_reason: banCreate.ban_reason,
        unban_reason: unbanReason,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(unbanResult);
  // 4. Retrieve ban record details and validate
  const retrievedRecord = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: banCreate.id,
    },
  );
  typia.assert(retrievedRecord);
  // 5. Validate unban details
  TestValidator.equals("user ID matches", retrievedRecord.user.id, userToBan);
  TestValidator.predicate(
    "unbanned_at is set",
    retrievedRecord.unbanned_at !== null &&
      retrievedRecord.unbanned_at !== undefined,
  );
  TestValidator.equals(
    "unban reason matches",
    retrievedRecord.unban_reason,
    unbanReason,
  );
  TestValidator.equals(
    "ban reason preserved",
    retrievedRecord.ban_reason,
    banCreate.ban_reason,
  );
}
