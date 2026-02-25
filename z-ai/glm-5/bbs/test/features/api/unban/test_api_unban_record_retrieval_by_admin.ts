import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_unbans_create } from "../../../generate/generate_random_discussion_board_unbans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_unban } from "../../../prepare/prepare_random_discussion_board_unban";

/**
 * Test successful retrieval of an unban record by an administrator.
 *
 * This test validates that an administrator can retrieve detailed information
 * about a specific unban action, including the unban ID, original ban record details,
 * administrator information, unban reason, and created timestamp.
 *
 * Flow:
 * 1. Create a target user who will be banned
 * 2. Create an admin user who will perform ban/unban operations
 * 3. Admin bans the target user
 * 4. Admin unbans the target user
 * 5. Retrieve and validate the unban record
 */
export async function test_api_unban_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create target user who will be banned
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser = await authorize_user_join(targetUserConnection, {
    body: {
      displayName: RandomGenerator.name(1),
    },
  });
  typia.assert(targetUser);
  // Step 2: Create admin user who will perform ban/unban operations
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_user_join(adminConnection, {
    body: {
      displayName: `Admin_${RandomGenerator.alphabets(8)}`,
    },
  });
  typia.assert(adminUser);
  // Step 3: Admin bans the target user
  const banReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const ban = await generate_random_discussion_board_bans_create(
    adminConnection,
    {
      body: {
        userId: targetUser.id,
        reason: banReason,
      },
    },
  );
  typia.assert(ban);
  // Step 4: Admin unbans the target user
  const unbanReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 7,
  });
  const unban = await generate_random_discussion_board_unbans_create(
    adminConnection,
    {
      body: {
        discussion_board_ban_id: ban.id,
        reason: unbanReason,
      },
    },
  );
  typia.assert(unban);
  // Step 5: Retrieve and validate the unban record
  const retrievedUnban = await api.functional.discussionBoard.unbans.at(
    adminConnection,
    {
      unbanId: unban.id,
    },
  );
  typia.assert(retrievedUnban);
  // Validate unban ID matches
  TestValidator.equals("unban ID matches", retrievedUnban.id, unban.id);
  // Validate unban reason matches
  TestValidator.equals(
    "unban reason matches",
    retrievedUnban.reason,
    unbanReason,
  );
  // Validate original ban record details
  TestValidator.equals("ban ID matches", retrievedUnban.ban.id, ban.id);
  TestValidator.equals(
    "ban reason matches",
    retrievedUnban.ban.reason,
    banReason,
  );
  // Validate banned user info
  TestValidator.equals(
    "banned user ID matches",
    retrievedUnban.ban.user.id,
    targetUser.id,
  );
  TestValidator.equals(
    "banned user display name matches",
    retrievedUnban.ban.user.displayName,
    targetUser.displayName,
  );
  // Validate administrator info who performed the unban
  TestValidator.equals(
    "administrator ID matches",
    retrievedUnban.administrator.id,
    adminUser.id,
  );
  TestValidator.equals(
    "administrator display name matches",
    retrievedUnban.administrator.displayName,
    adminUser.displayName,
  );
  // Validate created timestamp exists and is valid date-time format
  TestValidator.predicate(
    "created timestamp exists",
    retrievedUnban.createdAt !== null && retrievedUnban.createdAt !== undefined,
  );
}
