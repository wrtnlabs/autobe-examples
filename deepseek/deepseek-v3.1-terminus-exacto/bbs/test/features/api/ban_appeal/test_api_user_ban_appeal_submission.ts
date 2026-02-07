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

/**
 * Test the complete ban appeal workflow where a user submits an appeal against their own ban.
 * 1. Create and authenticate a regular user
 * 2. Create and authenticate an administrator
 * 3. Administrator creates a ban record targeting the user
 * 4. User submits an appeal against the ban with a valid reason
 * 5. Validate appeal creation with 'pending' status and correct relationships
 */
export async function test_api_user_ban_appeal_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpassword123",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Administrator creates ban record targeting the user
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. User submits appeal against the ban
  const appealReason = RandomGenerator.paragraph({ sentences: 4 });
  const appeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        body: {
          appeal_reason: appealReason,
        } satisfies IDiscussionBoardBanAppeal.ICreate,
        params: {
          banRecordId: banRecord.id,
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
    appealReason,
  );
  TestValidator.equals(
    "appeal should reference correct ban record",
    appeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "appeal should reference correct user",
    appeal.user.id,
    user.id,
  );
  TestValidator.predicate(
    "appeal should have valid appealed_at timestamp",
    typeof appeal.appealed_at === "string" && appeal.appealed_at.length > 0,
  );
  TestValidator.predicate(
    "appeal should have valid created_at timestamp",
    typeof appeal.created_at === "string" && appeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "appeal should have valid updated_at timestamp",
    typeof appeal.updated_at === "string" && appeal.updated_at.length > 0,
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
}
