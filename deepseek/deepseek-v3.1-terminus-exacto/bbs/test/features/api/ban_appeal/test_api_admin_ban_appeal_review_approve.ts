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

export async function test_api_admin_ban_appeal_review_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Admin creates ban on user
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // 4. User submits ban appeal
  const appealReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  // Note: There is no specific utility function for submitting ban appeals in the provided utilities.
  // We assume there should be an endpoint for users to submit appeals, but since it's not defined,
  // we'll simulate that the appeal exists and is in pending state for the administrator to review.
  // This is a limitation in the test scenario - we assume the appeal was created through some means.
  // 5. Administrator reviews and approves the appeal
  const decisionReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const appealReview =
    await api.functional.discussionBoard.admin.bans.appeals.review(
      adminConnection,
      {
        banId: ban.id,
        appealId: typia.random<string & tags.Format<"uuid">>(), // This should ideally come from the appeal submission
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IReview,
      },
    );
  typia.assert(appealReview);
  // 6. Validate the appeal review response
  TestValidator.equals(
    "appeal status should be approved",
    appealReview.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason should match input",
    appealReview.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp should be set",
    appealReview.reviewed_at !== null && appealReview.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewer should be set",
    appealReview.reviewer !== null && appealReview.reviewer !== undefined,
  );
  if (appealReview.reviewer) {
    TestValidator.equals(
      "reviewer should be the administering administrator",
      appealReview.reviewer.id,
      admin.id,
    );
  }
  // 7. Validate associated ban record reflects the appeal decision
  TestValidator.equals(
    "ban appeal status should be approved",
    appealReview.banRecord.appealStatus,
    "approved",
  );
  // Additional validation that the ban status reflects the appeal decision
  // (specific business logic would determine how ban status changes upon approval)
  TestValidator.predicate(
    "ban record should be accessible via appeal",
    appealReview.banRecord.id === ban.id,
  );
}
