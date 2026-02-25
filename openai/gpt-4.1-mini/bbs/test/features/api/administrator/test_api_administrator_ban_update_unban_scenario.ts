import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_ban_update_unban_scenario(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test updating an existing ban record with the ban removed by clearing the bannedAt timestamp,
  // simulating an unban scenario. Verify audit timestamps updates and that the ban record remains.
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureP@ssw0rd",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorizedAdmin);
  // 2. Create a ban record to update (ban a registered user)
  // Use generation utility since it handles necessary data preparation
  const originalBan =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(originalBan);
  // 3. Prepare updated ban data to simulate unban (clear bannedAt)
  // Keep other fields same except bannedAt set to undefined/null (nullable)
  const updatedBanBody: IDiscussionBoardUserBan.IUpdate = {
    reason: originalBan.reason,
    bannedAt: undefined,
    administratorId: originalBan.administratorId ?? null,
    createdAt: originalBan.createdAt,
    updatedAt: originalBan.updatedAt,
    deletedAt: originalBan.deletedAt ?? null,
  };
  // 4. Update ban record - unban scenario
  const unbannedBan =
    await api.functional.discussionBoard.administrator.administrator.bans.update(
      adminConnection,
      {
        banId: originalBan.id,
        body: updatedBanBody,
      },
    );
  typia.assert(unbannedBan);
  // 5. Validate ban record integrity
  // - ID must remain same
  TestValidator.equals("ban id unchanged", unbannedBan.id, originalBan.id);
  // - bannedAt must be null (unbanned)
  TestValidator.equals(
    "bannedAt cleared (unbanned)",
    unbannedBan.bannedAt,
    null,
  );
  // - reason must remain same
  TestValidator.equals(
    "reason unchanged",
    unbannedBan.reason,
    originalBan.reason,
  );
  // - administratorId must remain same or null
  TestValidator.equals(
    "administratorId unchanged",
    unbannedBan.administratorId ?? null,
    originalBan.administratorId ?? null,
  );
  // - createdAt must remain same
  TestValidator.equals(
    "createdAt unchanged",
    unbannedBan.createdAt,
    originalBan.createdAt,
  );
  // - updatedAt must be different (updated timestamp)
  TestValidator.notEquals(
    "updatedAt changed",
    unbannedBan.updatedAt,
    originalBan.updatedAt,
  );
  // - deletedAt must remain same or null
  TestValidator.equals(
    "deletedAt unchanged",
    unbannedBan.deletedAt ?? null,
    originalBan.deletedAt ?? null,
  );
}
