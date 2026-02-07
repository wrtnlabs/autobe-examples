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

export async function test_api_superadmin_ban_appeal_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for ban creation
  const superAdminBanConnection: api.IConnection = { host: connection.host };
  const superAdminBan = await authorize_super_admin_join(
    superAdminBanConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminBan);
  // Create a ban record that will be appealed
  const ban = await generate_random_discussion_board_super_admin_bans_create(
    superAdminBanConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Create separate super administrator connection for appeal processing
  const superAdminAppealConnection: api.IConnection = { host: connection.host };
  const superAdminAppeal = await authorize_super_admin_join(
    superAdminAppealConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAppeal);
  // First, create an appeal (appeal should be in pending status initially)
  // Note: The appeal creation endpoint is not available in the provided API functions
  // Since we don't have an appeal creation endpoint, we'll assume the appeal exists
  // and proceed with updating its status
  // Update appeal status from pending to under_review
  const underReviewAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminAppealConnection,
      {
        banId: ban.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(underReviewAppeal);
  // Validate appeal is now under review
  TestValidator.equals(
    "appeal status should be under_review",
    underReviewAppeal.status,
    "under_review",
  );
  // Update appeal status from under_review to rejected with decision reason
  const decisionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedAppeal =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminAppealConnection,
      {
        banId: ban.id,
        body: {
          status: "rejected",
          decision_reason: decisionReason,
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(rejectedAppeal);
  // Validate appeal rejection details
  TestValidator.equals(
    "appeal status should be rejected",
    rejectedAppeal.status,
    "rejected",
  );
  TestValidator.equals(
    "decision reason should match input",
    rejectedAppeal.decision_reason,
    decisionReason,
  );
  TestValidator.predicate(
    "reviewer should be assigned",
    rejectedAppeal.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed at timestamp should be set",
    rejectedAppeal.reviewed_at !== null,
  );
  TestValidator.equals(
    "ban record should match",
    rejectedAppeal.banRecord.id,
    ban.id,
  );
  TestValidator.equals(
    "ban status should remain active",
    rejectedAppeal.banRecord.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban reason should match original",
    rejectedAppeal.banRecord.ban_reason,
    ban.ban_reason,
  );
  // Validate reviewer information
  TestValidator.equals(
    "reviewer email should match",
    rejectedAppeal.reviewer?.email,
    superAdminAppeal.email,
  );
  TestValidator.predicate(
    "reviewer should have display name",
    rejectedAppeal.reviewer?.display_name !== undefined,
  );
}
