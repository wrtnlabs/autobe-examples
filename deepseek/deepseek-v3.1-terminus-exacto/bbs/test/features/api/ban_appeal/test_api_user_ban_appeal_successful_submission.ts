import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_bans_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_appeal_successful_submission(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Create ban record targeting the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason:
          "Test ban reason for appeal testing. This is a detailed explanation.",
        banDurationType: "temporary",
        banDurationDays: 7,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Submit ban appeal as the user
  const appealReason =
    "I believe this ban was made in error. I was following the community guidelines and would like to appeal this decision.";
  const appeal = await api.functional.discussionBoard.user.bans.appeals.create(
    userConnection,
    {
      banId: banRecord.id,
      body: {
        appeal_reason: appealReason,
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // Validate the appeal response
  TestValidator.equals(
    "appeal reason matches input",
    appeal.appeal_reason,
    appealReason,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.predicate(
    "appeal has valid timestamp",
    () => new Date(appeal.appealed_at).getTime() > 0,
  );
  TestValidator.predicate(
    "appeal has creation timestamp",
    () => new Date(appeal.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "appeal has update timestamp",
    () => new Date(appeal.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "appeal references the correct ban record",
    appeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "appeal references the correct user",
    appeal.user.id,
    userAuth.id,
  );
  // Verify decision_reason is undefined or null (not yet reviewed)
  TestValidator.predicate(
    "decision reason not set yet",
    () =>
      appeal.decision_reason === null || appeal.decision_reason === undefined,
  );
  // Verify reviewed_at is null (appeal not yet reviewed)
  TestValidator.predicate(
    "appeal not yet reviewed",
    () => appeal.reviewed_at === null || appeal.reviewed_at === undefined,
  );
}
