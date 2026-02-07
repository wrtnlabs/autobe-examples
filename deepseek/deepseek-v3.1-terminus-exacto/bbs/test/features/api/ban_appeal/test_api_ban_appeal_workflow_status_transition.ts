import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_bans_appeals_create } from "../../../generate/generate_random_discussion_board_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test ban appeal workflow status validation and transitions.
 * Administrator reviews appeal with different status transitions: pending to under_review,
 * under_review to approved/rejected. Validate that invalid transitions (approved back to pending)
 * are rejected. Test that decision_reason is required only when moving to final status
 * (approved/rejected). Verify reviewed_at timestamp logic for different status transitions
 * and ensure workflow constraints are enforced.
 */
export async function test_api_ban_appeal_workflow_status_transition(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Create ban record
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Create appeal
  const appeal = await generate_random_discussion_board_bans_appeals_create(
    adminConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: ban.id,
      },
    },
  );
  typia.assert(appeal);
  // Test 1: Move from pending to under_review
  const underReviewAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: ban.id,
        appealId: appeal.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal);
  TestValidator.equals(
    "status should be under_review",
    underReviewAppeal.status,
    "under_review",
  );
  TestValidator.predicate(
    "reviewed_at should be null during review",
    underReviewAppeal.reviewed_at === null,
  );
  // Test 2: Move from under_review to approved with decision_reason
  const approvedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: ban.id,
        appealId: appeal.id,
        body: {
          status: "approved",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);
  TestValidator.equals(
    "status should be approved",
    approvedAppeal.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    approvedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "decision_reason should be provided",
    approvedAppeal.decision_reason !== null,
  );
  // Test 3: Invalid transition - approved back to pending (should fail)
  await TestValidator.error(
    "should reject invalid status transition",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
        adminConnection,
        {
          banId: ban.id,
          appealId: appeal.id,
          body: {
            status: "pending",
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Test 4: Create new appeal for rejected test
  const appeal2 = await generate_random_discussion_board_bans_appeals_create(
    adminConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: ban.id,
      },
    },
  );
  typia.assert(appeal2);
  // Test 5: Move directly from pending to rejected with decision_reason
  const rejectedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: ban.id,
        appealId: appeal2.id,
        body: {
          status: "rejected",
          decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  TestValidator.equals(
    "status should be rejected",
    rejectedAppeal.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    rejectedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "decision_reason should be provided",
    rejectedAppeal.decision_reason !== null,
  );
  // Test 6: Missing decision_reason for final status (should fail)
  const appeal3 = await generate_random_discussion_board_bans_appeals_create(
    adminConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: ban.id,
      },
    },
  );
  typia.assert(appeal3);
  await TestValidator.error(
    "should require decision_reason for approved status",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
        adminConnection,
        {
          banId: ban.id,
          appealId: appeal3.id,
          body: {
            status: "approved",
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "should require decision_reason for rejected status",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
        adminConnection,
        {
          banId: ban.id,
          appealId: appeal3.id,
          body: {
            status: "rejected",
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Test 7: Valid transition without decision_reason for non-final status
  const appeal4 = await generate_random_discussion_board_bans_appeals_create(
    adminConnection,
    {
      body: {
        appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardBanAppeal.ICreate,
      params: {
        banId: ban.id,
      },
    },
  );
  typia.assert(appeal4);
  const underReviewAppeal2 =
    await api.functional.discussionBoard.admin.bans.appeals.putByBanidAndAppealid(
      adminConnection,
      {
        banId: ban.id,
        appealId: appeal4.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal2);
  TestValidator.equals(
    "status should be under_review",
    underReviewAppeal2.status,
    "under_review",
  );
  TestValidator.predicate(
    "decision_reason should be null for non-final status",
    underReviewAppeal2.decision_reason === null,
  );
}
