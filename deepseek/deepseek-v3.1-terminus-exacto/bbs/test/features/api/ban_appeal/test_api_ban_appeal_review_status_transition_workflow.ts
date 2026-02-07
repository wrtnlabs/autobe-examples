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

export async function test_api_ban_appeal_review_status_transition_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.user.join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create ban record
  const banRecord =
    await api.functional.discussionBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          ban_status: "active" as const,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // User submits appeal (starts in 'pending' state)
  const initialAppeal =
    await api.functional.discussionBoard.user.ban_records.appeals.create(
      userConnection,
      {
        banRecordId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(initialAppeal);
  TestValidator.equals(
    "appeal starts in pending state",
    initialAppeal.status,
    "pending",
  );
  // Test invalid direct transition from pending to approved (should fail)
  await TestValidator.error("cannot skip under_review state", async () => {
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: initialAppeal.id,
      body: {
        status: "approved",
        decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  });
  // Admin transitions appeal to 'under_review' state
  const underReviewAppeal =
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: initialAppeal.id,
      body: {
        status: "under_review",
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  typia.assert(underReviewAppeal);
  TestValidator.equals(
    "appeal transitions to under_review",
    underReviewAppeal.status,
    "under_review",
  );
  // Admin approves the appeal with decision reason
  const approvedAppeal =
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: initialAppeal.id,
      body: {
        status: "approved",
        decision_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  typia.assert(approvedAppeal);
  TestValidator.equals("appeal approved", approvedAppeal.status, "approved");
  TestValidator.predicate(
    "decision reason provided",
    approvedAppeal.decision_reason !== null,
  );
  TestValidator.predicate(
    "reviewed timestamp set",
    approvedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer information recorded",
    approvedAppeal.reviewer !== null,
  );
  // Validate final state cannot be modified
  await TestValidator.error("cannot modify approved appeal", async () => {
    await api.functional.discussionBoard.admin.appeals.review(adminConnection, {
      banId: banRecord.id,
      appealId: initialAppeal.id,
      body: {
        status: "under_review",
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    });
  });
  // Test that decision reason is required for final states
  await TestValidator.error(
    "decision reason required for approval",
    async () => {
      await api.functional.discussionBoard.admin.appeals.review(
        adminConnection,
        {
          banId: banRecord.id,
          appealId: initialAppeal.id,
          body: {
            status: "approved",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
}
