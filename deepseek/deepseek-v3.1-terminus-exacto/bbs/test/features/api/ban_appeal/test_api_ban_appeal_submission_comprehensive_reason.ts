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
import { generate_random_discussion_board_bans_appeals_create } from "../../../generate/generate_random_discussion_board_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_submission_comprehensive_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create ban record
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
  // Create ban record using utility function
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 2. User setup - register and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Submit comprehensive appeal with detailed reasoning using utility function
  const comprehensiveReason = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 4,
    wordMax: 12,
  });
  const appeal = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason: comprehensiveReason,
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: banRecord.id,
      },
    },
  );
  typia.assert(appeal);
  // 4. Validate appeal submission
  TestValidator.equals(
    "appeal reason matches input",
    appeal.appeal_reason,
    comprehensiveReason,
  );
  TestValidator.equals("appeal status is pending", appeal.status, "pending");
  TestValidator.equals(
    "ban record ID matches",
    appeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.predicate(
    "appealed_at timestamp is set",
    appeal.appealed_at !== null,
  );
  TestValidator.predicate(
    "user information is present",
    appeal.user.display_name !== undefined,
  );
  TestValidator.predicate(
    "decision_reason is null initially",
    appeal.decision_reason === null,
  );
  TestValidator.predicate(
    "reviewed_at is null initially",
    appeal.reviewed_at === null,
  );
  TestValidator.predicate(
    "reviewer is null initially",
    appeal.reviewer === null,
  );
  TestValidator.predicate(
    "appeal reason is comprehensive",
    appeal.appeal_reason.length > 100,
  );
}
