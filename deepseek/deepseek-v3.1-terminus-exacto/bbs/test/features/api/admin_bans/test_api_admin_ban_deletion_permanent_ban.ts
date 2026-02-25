import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

/**
 * Test scenario for deleting a permanent ban record by an administrator.
 * Sequence: Admin joins via /auth/admin/join → Admin creates a permanent ban
 * record using the /admin/bans endpoint → Admin deletes the permanent ban record.
 * Verify that permanent bans can be properly deleted through the same mechanism
 * as temporary bans, ensuring the ban is removed and user access is restored.
 * Validate that ban metadata including the permanent nature is preserved in
 * the returned deleted record.
 */
export async function test_api_admin_ban_deletion_permanent_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Update admin connection with authorization header
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminJoinResult.token.access,
  };
  // Create a permanent ban record using utility function
  const createdBan = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "permanent" as const,
        banDurationDays: null,
      },
    },
  );
  typia.assert(createdBan);
  // Validate ban metadata
  TestValidator.equals(
    "ban duration type",
    createdBan.banDurationType,
    "permanent",
  );
  TestValidator.equals("ban duration days", createdBan.banDurationDays, null);
  // Delete the ban record
  await api.functional.discussionBoard.admin.bans.erase(adminConnection, {
    banId: createdBan.id,
  });
  // Verify ban deletion by attempting to delete again (should fail)
  await TestValidator.error("ban should not exist after deletion", async () => {
    await api.functional.discussionBoard.admin.bans.erase(adminConnection, {
      banId: createdBan.id,
    });
  });
}
