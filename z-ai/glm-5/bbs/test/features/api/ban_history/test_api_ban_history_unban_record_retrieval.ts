import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
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
 * Test retrieval of an UNBAN type ban history record.
 *
 * Workflow:
 * 1. Create a target user account who will be banned
 * 2. Create an admin user connection for ban/unban operations
 * 3. Create a ban record for the target user
 * 4. Create an unban record to reverse the ban
 * 5. Retrieve the unban history record by ID
 * 6. Validate all fields of the response
 */
export async function test_api_ban_history_unban_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create target user who will be banned and then unbanned
  const targetUserConnection: api.IConnection = { host: connection.host };
  const targetUser: IDiscussionBoardUser.IAuthorized =
    await authorize_user_join(targetUserConnection, {});
  typia.assert(targetUser);
  // Step 2: Create admin connection for ban/unban operations
  // Note: In production, this would use proper admin credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: IDiscussionBoardUser.IAuthorized = await authorize_user_join(
    adminConnection,
    {},
  );
  typia.assert(adminUser);
  // Step 3: Ban the target user
  const ban: IDiscussionBoardBan =
    await generate_random_discussion_board_bans_create(adminConnection, {
      body: {
        userId: targetUser.id,
        reason:
          "Violation of community guidelines - creating test ban record for E2E validation",
      },
    });
  typia.assert(ban);
  // Step 4: Unban the user
  const unbanReason =
    "Appeal approved - user has been reinstated to the platform after review";
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
  // Step 5: Retrieve the unban history record
  // The ban history record for the unban action uses the unban record's ID
  // This is the audit trail record created when the unban action was performed
  const retrievalConnection: api.IConnection = { host: connection.host };
  retrievalConnection.headers = { ...adminConnection.headers };
  const banHistory: IDiscussionBoardBanHistory =
    await api.functional.discussionBoard.ban_histories.at(retrievalConnection, {
      banHistoryId: unban.id,
    });
  typia.assert(banHistory);
  // Step 6: Validate the unban history record fields
  TestValidator.equals(
    "actionType should be UNBAN",
    banHistory.actionType,
    "UNBAN",
  );
  TestValidator.equals(
    "reason should match the unban reason provided",
    banHistory.reason,
    unbanReason,
  );
  TestValidator.predicate(
    "createdAt should be a valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(banHistory.createdAt),
  );
  // Validate targetUser reference - should reference the unbanned user
  TestValidator.predicate(
    "targetUser should not be null for unban history",
    banHistory.targetUser !== null,
  );
  if (banHistory.targetUser !== null) {
    TestValidator.equals(
      "targetUser.id should match the originally banned user",
      banHistory.targetUser.id,
      targetUser.id,
    );
    TestValidator.equals(
      "targetUser.email should match the banned user email",
      banHistory.targetUser.email,
      targetUser.email,
    );
  }
  // Validate actor reference - should reference the admin who performed unban
  TestValidator.predicate(
    "actor should not be null for unban history",
    banHistory.actor !== null,
  );
  if (banHistory.actor !== null) {
    TestValidator.equals(
      "actor.id should match the administrator who performed unban",
      banHistory.actor.id,
      adminUser.id,
    );
  }
  // Validate ban reference - should reference the original ban record
  TestValidator.predicate(
    "ban reference should not be null for UNBAN action",
    banHistory.ban !== null,
  );
  if (banHistory.ban !== null) {
    TestValidator.equals(
      "ban.id should match the original ban record",
      banHistory.ban.id,
      ban.id,
    );
    TestValidator.predicate(
      "ban.reason should be populated",
      banHistory.ban.reason.length >= 10,
    );
    TestValidator.predicate(
      "ban.created_at should be a valid datetime",
      /^\d{4}-\d{2}-\d{2}T/.test(banHistory.ban.created_at),
    );
  }
}
