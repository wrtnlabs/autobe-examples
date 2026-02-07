import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_ban_records_create } from "../../../generate/generate_random_discussion_board_super_admin_ban_records_create";
import { generate_random_discussion_board_user_ban_records_appeals_create } from "../../../generate/generate_random_discussion_board_user_ban_records_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_status_transition_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create ban record using utility function
  const banRecord =
    await generate_random_discussion_board_super_admin_ban_records_create(
      superAdminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits appeal using utility function
  const appeal =
    await generate_random_discussion_board_user_ban_records_appeals_create(
      userConnection,
      {
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
        params: { banRecordId: banRecord.id },
      },
    );
  typia.assert(appeal);
  // Verify initial appeal status is 'pending'
  TestValidator.equals(
    "initial appeal status should be pending",
    appeal.status,
    "pending",
  );
  TestValidator.equals(
    "appeal should reference correct ban record",
    appeal.banRecord.id,
    banRecord.id,
  );
  // Super admin places appeal under review (decision_reason optional for intermediate state)
  const underReviewAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "under_review",
          decision_reason: null,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal);
  // Verify appeal is now under review
  TestValidator.equals(
    "appeal status should transition to under_review",
    underReviewAppeal.status,
    "under_review",
  );
  TestValidator.equals(
    "decision reason should be null for under_review state",
    underReviewAppeal.decision_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at timestamp should be set",
    underReviewAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer information should be present",
    underReviewAppeal.reviewer !== null,
  );
  // Super admin approves the appeal (decision_reason required for final state)
  const approvedAppeal =
    await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
      superAdminConnection,
      {
        banRecordId: banRecord.id,
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);
  // Verify appeal is approved
  TestValidator.equals(
    "appeal status should transition to approved",
    approvedAppeal.status,
    "approved",
  );
  TestValidator.predicate(
    "decision reason should be provided for approval",
    approvedAppeal.decision_reason !== null &&
      approvedAppeal.decision_reason.length > 0,
  );
  TestValidator.predicate(
    "reviewed_at timestamp should be updated",
    approvedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer information should be present",
    approvedAppeal.reviewer !== null,
  );
  // Test that decision_reason is required for final status transitions
  await TestValidator.error(
    "should reject final status transition without decision reason",
    async () => {
      await api.functional.discussionBoard.superAdmin.ban_records.appeals.putByBanrecordidAndAppealid(
        superAdminConnection,
        {
          banRecordId: banRecord.id,
          appealId: appeal.id,
          body: {
            status: "rejected",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Validate complete audit trail
  TestValidator.predicate(
    "appeal should have complete workflow audit trail",
    approvedAppeal.appealed_at !== null &&
      approvedAppeal.reviewed_at !== null &&
      approvedAppeal.reviewer !== null,
  );
}
