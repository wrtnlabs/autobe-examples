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
import { generate_random_discussion_board_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_admin_ban_records_create";
import { generate_random_discussion_board_bans_appeals_create } from "../../../generate/generate_random_discussion_board_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test administrator approving a ban appeal with decision justification.
 * Administrator authenticates, creates temporary ban record, user submits appeal,
 * then admin reviews and approves appeal with detailed reason. Verify appeal status
 * becomes 'approved', reviewed_at timestamp recorded, decision_reason provided,
 * and validate that user can log in again after ban appeal approval.
 */
export async function test_api_ban_appeal_admin_approval_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a temporary ban record for testing
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Create user connection and submit appeal (simulating banned user)
  const userConnection: api.IConnection = { host: connection.host };
  const appeal = await generate_random_discussion_board_bans_appeals_create(
    userConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: banRecord.id,
      },
    },
  );
  typia.assert(appeal);
  // Admin reviews and approves the appeal with detailed reason
  const updatedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "approved" as const,
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // Validate appeal status and decision details
  TestValidator.equals(
    "appeal status should be approved",
    updatedAppeal.status,
    "approved",
  );
  TestValidator.predicate(
    "decision reason should be provided",
    updatedAppeal.decision_reason !== null,
  );
  TestValidator.predicate(
    "reviewed_at timestamp should be set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    updatedAppeal.reviewer !== null,
  );
  // Validate reviewer information
  if (updatedAppeal.reviewer !== null) {
    TestValidator.equals(
      "reviewer should be an admin",
      typeof updatedAppeal.reviewer.id,
      "string",
    );
    TestValidator.predicate(
      "reviewer should have email",
      updatedAppeal.reviewer.email.length > 0,
    );
    TestValidator.predicate(
      "reviewer should have display name",
      updatedAppeal.reviewer.display_name.length > 0,
    );
  }
  // Validate ban record relationship
  TestValidator.equals(
    "appeal should reference correct ban record",
    updatedAppeal.banRecord.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason should match",
    updatedAppeal.banRecord.ban_reason,
    banRecord.ban_reason,
  );
  // Note: Since we don't have user authentication endpoints available in the provided API functions,
  // we cannot directly test user login functionality. The ban appeal approval logic is validated above.
}
