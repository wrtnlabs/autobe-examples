import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test the complete ban appeal approval workflow from submission to final approval.
 * A super administrator should be able to review a pending ban appeal, update its status
 * to 'under_review', then approve it with a detailed decision reason. The system should
 * properly track the appeal workflow progression, assign the reviewing administrator,
 * and record timestamps for each status transition. Validate that the approved appeal
 * correctly updates the ban status and restores user access.
 */
export async function test_api_superadmin_ban_appeal_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a ban record that will be appealed
  const ban = await generate_random_discussion_board_super_admin_bans_create(
    superAdminConnection,
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
  // 3. Since ban appeal creation endpoint is not available in provided utilities,
  // we'll test the appeal update functionality directly assuming an appeal exists
  // This tests the super admin's ability to manage appeal workflow states
  // Update appeal status to 'under_review'
  const underReviewUpdate =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminConnection,
      {
        banId: ban.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewUpdate);
  // 4. Validate 'under_review' status transition
  TestValidator.equals(
    "status should be under_review",
    underReviewUpdate.status,
    "under_review",
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    underReviewUpdate.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at should be set",
    underReviewUpdate.reviewed_at !== null,
  );
  // 5. Update appeal status to 'approved' with decision reason
  const decisionReason = RandomGenerator.paragraph({ sentences: 3 });
  const approvedUpdate =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminConnection,
      {
        banId: ban.id,
        body: {
          status: "approved",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(approvedUpdate);
  // 6. Validate final approved state
  TestValidator.equals(
    "status should be approved",
    approvedUpdate.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason should match",
    approvedUpdate.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewer should remain assigned",
    approvedUpdate.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at should be updated",
    approvedUpdate.reviewed_at !== null,
  );
  // 7. Validate workflow progression completeness
  TestValidator.notEquals(
    "updated_at should change after approval",
    approvedUpdate.updated_at,
    underReviewUpdate.updated_at,
  );
}
