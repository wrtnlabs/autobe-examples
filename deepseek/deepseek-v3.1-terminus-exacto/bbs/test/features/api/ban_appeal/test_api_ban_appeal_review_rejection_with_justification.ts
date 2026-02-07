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

export async function test_api_ban_appeal_review_rejection_with_justification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user_password_123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create ban record for serious violation
  const banRecord =
    await generate_random_discussion_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          ban_reason:
            "Repeated harassment violations against community guidelines",
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<365>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Create ban appeal
  const appeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        body: {
          appeal_reason: "I believe the ban was too harsh for my actions",
        } satisfies IDiscussionBoardBanAppeal.ICreate,
        params: {
          banRecordId: banRecord.id,
        },
      },
    );
  typia.assert(appeal);
  // 5. Administrator reviews and rejects the appeal
  const rejectionReason =
    "The ban decision was appropriate due to the severity and repeated nature of the harassment violations. The user's appeal does not demonstrate sufficient understanding of the community guidelines or show remorse for the harmful behavior.";
  const reviewedAppeal =
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: appeal.id,
      body: {
        status: "rejected",
        decision_reason: rejectionReason,
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  typia.assert(reviewedAppeal);
  // 6. Validate appeal rejection
  await TestValidator.equals(
    "appeal status should be rejected",
    reviewedAppeal.status,
    "rejected",
  );
  await TestValidator.equals(
    "decision reason should match",
    reviewedAppeal.decision_reason,
    rejectionReason,
  );
  await TestValidator.predicate(
    "reviewed_at timestamp should be set",
    reviewedAppeal.reviewed_at !== null,
  );
  await TestValidator.predicate(
    "reviewer should be attributed",
    reviewedAppeal.reviewer !== null,
  );
  // 7. Validate ban record linkage
  await TestValidator.equals(
    "ban record id should match",
    reviewedAppeal.banRecord.id,
    banRecord.id,
  );
  await TestValidator.equals(
    "ban status should remain active",
    reviewedAppeal.banRecord.ban_status,
    "active",
  );
}
