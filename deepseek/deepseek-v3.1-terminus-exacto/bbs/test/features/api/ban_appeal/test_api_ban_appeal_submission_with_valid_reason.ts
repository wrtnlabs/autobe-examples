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

export async function test_api_ban_appeal_submission_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a ban record using utility function
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Create user account that will submit the appeal
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 4. Submit ban appeal with valid reason using utility function
  const appealBody = {
    appeal_reason: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardBanAppeal.ICreate;
  const appeal = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: appealBody,
      params: {
        banId: banRecord.id,
      },
    },
  );
  typia.assert(appeal);
  // 5. Validate appeal creation
  TestValidator.equals(
    "appeal status should be pending",
    appeal.status,
    "pending",
  );
  TestValidator.equals(
    "appeal reason should match input",
    appeal.appeal_reason,
    appealBody.appeal_reason,
  );
  TestValidator.equals(
    "appeal should be linked to correct ban record",
    appeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.predicate(
    "appealed_at timestamp should be set",
    appeal.appealed_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    appeal.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    appeal.updated_at !== null,
  );
  TestValidator.equals(
    "decision_reason should be null initially",
    appeal.decision_reason,
    null,
  );
  TestValidator.equals(
    "reviewed_at should be null initially",
    appeal.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer should be null initially",
    appeal.reviewer,
    null,
  );
  TestValidator.equals("deleted_at should be null", appeal.deleted_at, null);
}
