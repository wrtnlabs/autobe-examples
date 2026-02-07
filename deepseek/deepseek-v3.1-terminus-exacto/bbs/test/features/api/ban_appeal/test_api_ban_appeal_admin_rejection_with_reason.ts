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

export async function test_api_ban_appeal_admin_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create ban record
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Create user connection (simulating user appeal submission)
  const userConnection: api.IConnection = { host: connection.host };
  // 4. User submits appeal against the ban
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
  // 5. Admin reviews and rejects appeal with detailed reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "rejected" as const,
          decision_reason: rejectionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(updatedAppeal);
  // 6. Validate appeal rejection details
  TestValidator.equals(
    "appeal status should be rejected",
    updatedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should match",
    updatedAppeal.decision_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    updatedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    updatedAppeal.reviewer !== null,
  );
  if (updatedAppeal.reviewer !== null) {
    TestValidator.equals(
      "reviewer should be the admin",
      updatedAppeal.reviewer.id,
      adminAuth.id,
    );
  }
  // 7. Verify ban remains active
  TestValidator.equals(
    "ban should remain active",
    banRecord.ban_status,
    "active",
  );
}
