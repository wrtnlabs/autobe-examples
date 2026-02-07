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
 * Test validation of proper ban appeal workflow transitions and error handling for invalid status changes.
 * Verify that the system prevents invalid transitions (e.g., skipping 'under_review' status or moving directly
 * from 'pending' to 'approved') and requires decision reasons for final status changes. Test edge cases like
 * attempting to update non-existent appeals or appeals that have already been decided.
 */
export async function test_api_superadmin_ban_appeal_workflow_transition_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a ban record for appeal testing
  const banRecord =
    await generate_random_discussion_board_super_admin_bans_create(
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
  typia.assert(banRecord);
  // Test 1: Valid workflow transition - pending → under_review
  const appealUpdate1 =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(appealUpdate1);
  TestValidator.equals(
    "status should be under_review",
    appealUpdate1.status,
    "under_review",
  );
  // Test 2: Valid workflow transition - under_review → approved with decision reason
  const appealUpdate2 =
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminConnection,
      {
        banId: banRecord.id,
        body: {
          status: "approved",
          decision_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  typia.assert(appealUpdate2);
  TestValidator.equals(
    "status should be approved",
    appealUpdate2.status,
    "approved",
  );
  TestValidator.predicate(
    "should have decision reason",
    appealUpdate2.decision_reason !== null,
  );
  // Test 3: Invalid transition - attempting to update already decided appeal
  await TestValidator.error(
    "should reject updating decided appeal",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
        superAdminConnection,
        {
          banId: banRecord.id,
          body: {
            status: "under_review",
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Test 4: Invalid transition - skipping under_review (pending → approved)
  // Create another ban record for fresh testing
  const banRecord2 =
    await generate_random_discussion_board_super_admin_bans_create(
      superAdminConnection,
      {
        body: {
          banned_user_id: typia.random<string & tags.Format<"uuid">>(),
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_type: "permanent",
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(banRecord2);
  await TestValidator.error(
    "should reject skipping under_review status",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
        superAdminConnection,
        {
          banId: banRecord2.id,
          body: {
            status: "approved",
            decision_reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Test 5: Missing decision reason when moving to final status
  const banRecord3 =
    await generate_random_discussion_board_super_admin_bans_create(
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
  typia.assert(banRecord3);
  // First move to under_review
  await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
    superAdminConnection,
    {
      banId: banRecord3.id,
      body: {
        status: "under_review",
      } satisfies IDiscussionBoardBanAppeal.IUpdate,
    },
  );
  await TestValidator.error(
    "should reject final status without decision reason",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
        superAdminConnection,
        {
          banId: banRecord3.id,
          body: {
            status: "rejected",
            // decision_reason intentionally omitted
          } satisfies IDiscussionBoardBanAppeal.IUpdate,
        },
      );
    },
  );
  // Test 6: Non-existent ban ID
  await TestValidator.error("should reject non-existent ban ID", async () => {
    await api.functional.discussionBoard.superAdmin.bans.appeals.patchByBanid(
      superAdminConnection,
      {
        banId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status: "under_review",
        } satisfies IDiscussionBoardBanAppeal.IUpdate,
      },
    );
  });
}
