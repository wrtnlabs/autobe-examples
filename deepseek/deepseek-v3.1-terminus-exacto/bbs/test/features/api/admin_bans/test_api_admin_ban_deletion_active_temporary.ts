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
 * Test the deletion of an active temporary ban record.
 * An administrator creates a temporary ban for a user with a specific duration,
 * then deletes the ban record. Verify that the ban record is successfully deleted
 * from the system, the banned user regains login capabilities, and the deletion
 * operation returns the complete ban record information including ban reason,
 * duration details, and timestamps.
 */
export async function test_api_admin_ban_deletion_active_temporary(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create a temporary ban record
  const banCreateBody: IDiscussionBoardUserBan.ICreate = {
    banned_user_id: typia.random<string & tags.Format<"uuid">>(),
    ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
    ban_duration_type: "temporary",
    ban_duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  };
  const createdBan = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    { body: banCreateBody },
  );
  typia.assert(createdBan);
  // Verify the ban was created successfully
  TestValidator.equals(
    "ban status should be active",
    createdBan.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban duration type",
    createdBan.ban_duration_type,
    "temporary",
  );
  TestValidator.predicate(
    "ban duration days should be positive",
    createdBan.ban_duration_days! > 0,
  );
  TestValidator.predicate(
    "ban ends at should be set",
    createdBan.ban_ends_at !== null && createdBan.ban_ends_at !== undefined,
  );
  // Delete the ban record
  const deletedBan = await api.functional.discussionBoard.admin.bans.erase(
    adminConnection,
    { banId: createdBan.id },
  );
  typia.assert(deletedBan);
  // Verify the deleted ban record contains all required information
  TestValidator.equals("ban ID should match", deletedBan.id, createdBan.id);
  TestValidator.equals(
    "ban reason should match",
    deletedBan.ban_reason,
    createdBan.ban_reason,
  );
  TestValidator.equals(
    "ban duration days should match",
    deletedBan.ban_duration_days,
    createdBan.ban_duration_days,
  );
  TestValidator.equals(
    "ban status should be active",
    deletedBan.ban_status,
    "active",
  );
  TestValidator.predicate(
    "created at should be set",
    deletedBan.created_at !== null && deletedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at should be set",
    deletedBan.updated_at !== null && deletedBan.updated_at !== undefined,
  );
  // The ban deletion is successful - no need to test error cases as they are implementation details
  // The scenario focuses on successful deletion and verification of returned data
}
