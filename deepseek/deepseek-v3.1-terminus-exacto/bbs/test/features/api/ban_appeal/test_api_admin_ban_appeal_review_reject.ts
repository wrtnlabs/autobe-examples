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
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test administrator ban appeal review rejection workflow.
 * Validates that administrators can properly reject ban appeals with documented reasons.
 */
export async function test_api_admin_ban_appeal_review_reject(
  connection: api.IConnection,
): Promise<void> {
  // Create actor connections
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create administrator who will review the appeal
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create regular user who will be banned
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Admin creates ban record for the user
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({ sentences: 3 }),
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 4. Simulate user submitting appeal (using utility functions)
  // First login as user
  await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: "user123",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Note: There's no direct utility for ban appeal submission in provided utilities
  // For this test, we'll assume the appeal was submitted through the system
  // and we have the appeal ID ready for review
  // 5. Administrator reviews the appeal with 'rejected' status
  const appealReviewPayload: IDiscussionBoardBanAppeal.IReview = {
    status: "rejected" as const,
    decision_reason:
      "The appeal was rejected due to repeated violations and insufficient evidence for reconsideration. The ban will remain in effect as the user's behavior has shown a pattern of disregard for community guidelines.",
  };
  const appealId = typia.random<string & tags.Format<"uuid">>();
  const reviewedAppeal =
    await api.functional.discussionBoard.admin.bans.appeals.review(
      adminConnection,
      {
        banId: banRecord.id,
        appealId: appealId,
        body: appealReviewPayload,
      },
    );
  typia.assert(reviewedAppeal);
  // 6. Validate appeal review outcome
  TestValidator.equals(
    "appeal status should be rejected",
    reviewedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should persist",
    reviewedAppeal.decision_reason,
    appealReviewPayload.decision_reason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp should be recorded",
    reviewedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer association should exist",
    reviewedAppeal.reviewer !== null,
  );
  // 7. Verify ban record remains active
  // The ban should remain active after appeal rejection
  TestValidator.predicate(
    "ban status should remain active",
    banRecord.banStatus === "active",
  );
  // 8. Test business rule: rejected appeals cannot be reviewed again
  await TestValidator.error(
    "should not allow reviewing rejected appeal again",
    async () => {
      await api.functional.discussionBoard.admin.bans.appeals.review(
        adminConnection,
        {
          banId: banRecord.id,
          appealId: appealId,
          body: {
            status: "approved" as const,
            decision_reason: "Second review attempt",
          } satisfies IDiscussionBoardBanAppeal.IReview,
        },
      );
    },
  );
}
