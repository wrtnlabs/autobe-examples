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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_bans_appeals_create } from "../../../generate/generate_random_discussion_board_user_bans_appeals_create";
import { prepare_random_discussion_board_ban_appeal } from "../../../prepare/prepare_random_discussion_board_ban_appeal";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_appeal_status_transitions(
  connection: api.IConnection,
): Promise<void> {
  // Create admin and user connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Register and login admin
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Register and login user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Admin creates ban record for the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // User creates ban appeal
  const initialAppeal =
    await api.functional.discussionBoard.user.bans.appeals.create(
      userConnection,
      {
        banId: banRecord.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(initialAppeal);
  TestValidator.equals(
    "appeal status should be pending initially",
    initialAppeal.status,
    "pending",
  );
  // Admin updates appeal status to under_review (no decision reason required)
  const underReviewAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "under_review",
          decision_reason: null,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal);
  TestValidator.equals(
    "appeal status should be under_review",
    underReviewAppeal.status,
    "under_review",
  );
  // Admin approves the appeal with decision reason
  const approvedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "approved",
          decision_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);
  TestValidator.equals(
    "appeal status should be approved",
    approvedAppeal.status,
    "approved",
  );
  TestValidator.predicate(
    "approved appeal should have decision reason",
    approvedAppeal.decision_reason !== null &&
      approvedAppeal.decision_reason!.length > 0,
  );
  // Test invalid transition - cannot revert from approved to under_review
  await TestValidator.error(
    "should not allow reverting approved appeal to under_review",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.update(
        adminConnection,
        {
          banId: banRecord.id,
          body: {
            status: "under_review",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Create another temporary user for rejection testing
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const secondBan = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: secondUser.id,
        banReason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "permanent" as const,
        banDurationDays: null,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(secondBan);
  const secondAppeal =
    await api.functional.discussionBoard.user.bans.appeals.create(
      secondUserConnection,
      {
        banId: secondBan.id,
        body: {
          appeal_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardBanAppeal.ICreate,
      },
    );
  typia.assert(secondAppeal);
  // Admin rejects the appeal with decision reason
  const rejectedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.update(
      adminConnection,
      {
        banId: secondBan.id,
        body: {
          status: "rejected",
          decision_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  TestValidator.equals(
    "appeal status should be rejected",
    rejectedAppeal.status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected appeal should have decision reason",
    rejectedAppeal.decision_reason !== null &&
      rejectedAppeal.decision_reason!.length > 0,
  );
  // Test invalid transition - cannot approve/reject without decision reason
  await TestValidator.error(
    "should not allow approve without decision reason",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.update(
        adminConnection,
        {
          banId: secondBan.id,
          body: {
            status: "approved",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Verify timestamp progression for first appeal workflow
  TestValidator.predicate(
    "initial appeal should have appealed_at timestamp",
    initialAppeal.appealed_at !== undefined,
  );
  TestValidator.predicate(
    "under_review appeal should have reviewed_at timestamp",
    underReviewAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "approved appeal should have reviewed_at timestamp",
    approvedAppeal.reviewed_at !== null,
  );
  // Verify reviewer assignment
  TestValidator.predicate(
    "reviewed appeals should have reviewer assigned",
    underReviewAppeal.reviewer !== undefined,
  );
  TestValidator.predicate(
    "approved appeal should have reviewer",
    approvedAppeal.reviewer !== undefined,
  );
}
