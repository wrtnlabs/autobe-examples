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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_user_ban_records_appeals_create } from "../../../generate/generate_random_discussion_board_user_ban_records_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_review_approval_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Setup user actor who will be banned and appeal
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Administrator creates ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason:
            "Violating community guidelines with inappropriate content",
          ban_duration_days: 30,
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // User submits ban appeal
  const appeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        params: { banRecordId: banRecord.id },
        body: {
          appeal_reason:
            "I apologize for my actions and promise to follow community guidelines going forward. The content was posted in error and has been removed.",
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(appeal);
  // Administrator reviews and approves the appeal with decision reason
  const approvedAppeal =
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: appeal.id,
      body: {
        status: "approved",
        decision_reason:
          "User has demonstrated understanding of guidelines and shown remorse. Appeal approved with warning.",
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  typia.assert(approvedAppeal);
  // Validate appeal approval business logic
  TestValidator.equals(
    "appeal status approved",
    approvedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason recorded",
    approvedAppeal.decision_reason,
    "User has demonstrated understanding of guidelines and shown remorse. Appeal approved with warning.",
  );
  TestValidator.notEquals(
    "reviewed_at timestamp set",
    approvedAppeal.reviewed_at,
    null,
  );
  TestValidator.notEquals("reviewer attributed", approvedAppeal.reviewer, null);
  TestValidator.equals(
    "reviewer matches examining admin",
    approvedAppeal.reviewer?.id,
    admin.id,
  );
}
