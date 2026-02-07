import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_ban_status_transition_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Since we cannot create ban records directly through the API (no create endpoint for ban records),
  // we'll test status transitions on existing ban records by updating their status directly
  // This tests the validation logic for status transitions
  // Test 1: Attempt to update ban status with valid transitions
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Test valid status update with revocation
  const revokedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: banId,
        body: {
          ban_status: "revoked",
          revoked_reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(revokedBan);
  TestValidator.equals(
    "ban status should be revoked",
    revokedBan.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should be set",
    revokedBan.revoked_at !== null,
  );
  TestValidator.predicate(
    "revocation reason should be set",
    revokedBan.revoked_reason !== null,
  );
  // Test 2: Attempt to update ban status to expired
  const expiredBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: banId,
        body: {
          ban_status: "expired",
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(expiredBan);
  TestValidator.equals(
    "ban status should be expired",
    expiredBan.ban_status,
    "expired",
  );
  // Test 3: Attempt to reactivate expired ban (should fail if validation exists)
  await TestValidator.error(
    "should not allow reactivating expired ban",
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.update(
        superAdminConnection,
        {
          banId: banId,
          body: {
            ban_status: "active",
          } satisfies IDiscussionBoardBanRecord.IUpdate,
        },
      );
    },
  );
  // Test 4: Attempt to revoke without reason (should fail if validation exists)
  await TestValidator.error("should require revocation reason", async () => {
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: banId,
        body: {
          ban_status: "revoked",
          // Missing revoked_reason
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  });
  // Test 5: Update ban reason and duration
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: banId,
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  TestValidator.predicate(
    "ban reason should be updated",
    updatedBan.ban_reason.length > 0,
  );
  TestValidator.predicate(
    "ban duration should be set",
    updatedBan.ban_duration_days !== null,
  );
}
