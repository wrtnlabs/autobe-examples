import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
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
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test successful retrieval of a ban history audit record by its unique identifier.
 * This test validates that after banning a user, the corresponding ban history
 * audit record can be retrieved with all expected embedded data.
 */
export async function test_api_ban_history_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator user who will perform the ban
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create target user who will be banned
  const targetUser = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(targetUser);
  // 3. Create a ban record (this should create a ban history entry)
  const banReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
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
  // 4. Retrieve the ban history record
  // Note: The ban history ID may differ from the ban ID.
  // We attempt retrieval using the ban ID, assuming a 1:1 relationship.
  const banHistory = await api.functional.discussionBoard.ban_histories.at(
    adminConnection,
    {
      banHistoryId: ban.id,
    },
  );
  typia.assert(banHistory);
  // 5. Validate the ban history response structure and data
  TestValidator.equals(
    "action type should be BAN",
    banHistory.actionType,
    "BAN",
  );
  TestValidator.equals(
    "reason should match ban reason",
    banHistory.reason,
    ban.reason,
  );
  // Validate target user information in history record
  TestValidator.predicate(
    "target user should exist in history",
    banHistory.targetUser !== null,
  );
  if (banHistory.targetUser !== null) {
    TestValidator.equals(
      "target user id should match",
      banHistory.targetUser.id,
      targetUser.id,
    );
    TestValidator.equals(
      "target user email should match",
      banHistory.targetUser.email,
      targetUser.email,
    );
  }
  // Validate actor (administrator) information in history record
  TestValidator.predicate(
    "actor should exist in history",
    banHistory.actor !== null,
  );
  if (banHistory.actor !== null) {
    TestValidator.equals(
      "actor id should match admin",
      banHistory.actor.id,
      admin.id,
    );
    TestValidator.equals(
      "actor email should match admin",
      banHistory.actor.email,
      admin.email,
    );
  }
  // Validate ban reference in history record
  TestValidator.predicate(
    "ban reference should exist for BAN action",
    banHistory.ban !== null,
  );
  if (banHistory.ban !== null) {
    TestValidator.equals("ban id should match", banHistory.ban.id, ban.id);
    TestValidator.equals(
      "ban reason should match",
      banHistory.ban.reason,
      ban.reason,
    );
    TestValidator.equals(
      "ban user id should match target",
      banHistory.ban.user.id,
      targetUser.id,
    );
  }
}
