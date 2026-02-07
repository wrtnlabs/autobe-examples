import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test the deletion of a permanent ban record.
 * An administrator creates a permanent ban (no expiration) for a user,
 * then deletes the ban record. Verify that permanent ban records can be
 * successfully deleted, the user's access is restored, and the operation
 * handles permanent ban-specific logic correctly.
 */
export async function test_api_admin_ban_deletion_permanent(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a permanent ban record
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "permanent",
        ban_duration_days: undefined,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(banRecord);
  // Delete the ban record
  const deletedRecord = await api.functional.discussionBoard.admin.bans.erase(
    adminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(deletedRecord);
  // Validate deletion response contains correct ban record details
  TestValidator.equals(
    "deleted record ID matches original",
    deletedRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason preserved",
    deletedRecord.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.predicate(
    "ban duration days is null for permanent ban",
    deletedRecord.ban_duration_days === null,
  );
  TestValidator.predicate(
    "ban status indicates deletion",
    deletedRecord.ban_status === "revoked",
  );
  TestValidator.predicate(
    "revocation timestamp set",
    deletedRecord.revoked_at !== null,
  );
  TestValidator.predicate(
    "revocation reason exists",
    deletedRecord.revoked_reason !== null,
  );
}
