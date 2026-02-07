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

/**
 * Test the complete workflow of ban appeal status progression by a super administrator.
 * Validates that status transitions follow defined workflow rules and that decision_reason
 * is properly required for final decision states.
 */
export async function test_api_super_admin_ban_appeal_status_progression(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since ban creation API is not available, we'll test with randomly generated IDs
  // This tests the status progression logic independently of ban record creation
  const banId = typia.random<string & tags.Format<"uuid">>();
  const appealId = typia.random<string & tags.Format<"uuid">>();
  // Step 1: Move appeal from pending to under_review (no decision_reason required)
  const underReviewAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
      superAdminConnection,
      {
        banId,
        appealId,
        body: {
          status: "under_review",
          decision_reason: null,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal);
  TestValidator.equals(
    "status should be under_review",
    underReviewAppeal.status,
    "under_review",
  );
  TestValidator.equals(
    "decision_reason should be null for under_review",
    underReviewAppeal.decision_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    underReviewAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    underReviewAppeal.reviewer !== null,
  );
  // Step 2: Test that decision_reason is required when moving to approved status
  await TestValidator.error(
    "should require decision_reason when approving",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
        superAdminConnection,
        {
          banId,
          appealId,
          body: {
            status: "approved",
            decision_reason: null, // This should fail validation
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Step 3: Move appeal from under_review to approved with proper decision_reason
  const approvalReason =
    "After thorough review, the ban appeal has been approved based on user's explanation.";
  const approvedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
      superAdminConnection,
      {
        banId,
        appealId,
        body: {
          status: "approved",
          decision_reason: approvalReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedAppeal);
  TestValidator.equals(
    "status should be approved",
    approvedAppeal.status,
    "approved",
  );
  TestValidator.equals(
    "decision_reason should match",
    approvedAppeal.decision_reason,
    approvalReason,
  );
  TestValidator.predicate(
    "reviewed_at should be updated",
    approvedAppeal.reviewed_at !== null,
  );
  TestValidator.equals(
    "reviewer ID should remain consistent",
    approvedAppeal.reviewer?.id,
    underReviewAppeal.reviewer?.id,
  );
  // Step 4: Test rejected status workflow with a different appeal
  const appealId2 = typia.random<string & tags.Format<"uuid">>();
  // Move second appeal directly from pending to rejected (testing different path)
  const rejectionReason =
    "The appeal does not provide sufficient evidence to overturn the ban decision.";
  const rejectedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
      superAdminConnection,
      {
        banId,
        appealId: appealId2,
        body: {
          status: "rejected",
          decision_reason: rejectionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  TestValidator.equals(
    "status should be rejected",
    rejectedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision_reason should match",
    rejectedAppeal.decision_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    rejectedAppeal.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    rejectedAppeal.reviewer !== null,
  );
  // Step 5: Validate workflow rules - cannot move back from final states
  await TestValidator.error(
    "should not allow moving from approved to pending",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
        superAdminConnection,
        {
          banId,
          appealId,
          body: {
            status: "pending",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  await TestValidator.error(
    "should not allow moving from rejected to under_review",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.putByBanidAndAppealid(
        superAdminConnection,
        {
          banId,
          appealId: appealId2,
          body: {
            status: "under_review",
            decision_reason: null,
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
}
