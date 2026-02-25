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
import { generate_random_discussion_board_user_appeals_create } from "../../../generate/generate_random_discussion_board_user_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_user_submits_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create regular user that will be banned
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: "user@test.com",
      password: "user123",
      display_name: "Test User",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Admin creates ban record
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: "Test ban reason for violation of community guidelines",
        banDurationType: "temporary" as const,
        banDurationDays: 7,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. User submits ban appeal
  const appeal = await generate_random_discussion_board_user_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason:
          "I believe this ban was issued in error and would like to appeal the decision",
      } satisfies IDiscussionBoardBanAppeal.ICreate,
    },
  );
  typia.assert(appeal);
  // 5. Validate appeal properties
  if (appeal.status !== "pending") {
    throw new Error(
      `Expected appeal status to be 'pending', but got '${appeal.status}'`,
    );
  }
  if (!appeal.appeal_reason || appeal.appeal_reason.length === 0) {
    throw new Error("Appeal reason should not be empty");
  }
  if (appeal.banRecord.id !== banRecord.id) {
    throw new Error("Appeal should link to the correct ban record");
  }
  if (appeal.user.id !== user.id) {
    throw new Error("Appeal should link to the correct user");
  }
  if (!appeal.appealed_at) {
    throw new Error("Appealed_at timestamp should be present");
  }
  if (appeal.reviewer !== null && appeal.reviewer !== undefined) {
    throw new Error("Reviewer should be null for new appeal");
  }
  if (appeal.reviewed_at !== null && appeal.reviewed_at !== undefined) {
    throw new Error("Reviewed_at should be null for new appeal");
  }
  if (appeal.decision_reason !== null && appeal.decision_reason !== undefined) {
    throw new Error("Decision_reason should be null for new appeal");
  }
}
