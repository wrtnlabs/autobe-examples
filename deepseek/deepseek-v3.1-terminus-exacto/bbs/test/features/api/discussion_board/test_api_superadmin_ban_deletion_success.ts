import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test the successful deletion of an active ban record by a super administrator.
 * Create a ban record first, then verify it exists, then delete it using the target operation.
 * Validate that the ban record is permanently removed from the system and that the response
 * contains the complete deleted ban record information with all audit trail details intact.
 */
export async function test_api_superadmin_ban_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a ban record using the utility function
  const banRecord =
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
  typia.assert(banRecord);
  // Verify the ban record has active status
  TestValidator.equals(
    "ban status should be active",
    banRecord.ban_status,
    "active",
  );
  // Delete the ban record using the erase endpoint
  const deletedBan = await api.functional.discussionBoard.superAdmin.bans.erase(
    superAdminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(deletedBan);
  // Validate that the deleted ban record matches the original
  TestValidator.equals(
    "deleted ban should match original",
    deletedBan.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason should match",
    deletedBan.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban duration type should match",
    deletedBan.ban_duration_type,
    banRecord.ban_duration_type,
  );
  // Verify all audit trail details are intact
  TestValidator.predicate(
    "should have banned user",
    deletedBan.banned_user !== undefined,
  );
  TestValidator.predicate(
    "should have banning administrator",
    deletedBan.banning_administrator !== undefined,
  );
  TestValidator.predicate(
    "should have creation timestamp",
    deletedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "should have update timestamp",
    deletedBan.updated_at !== undefined,
  );
  // Verify the ban record is actually deleted by attempting to fetch it again
  await TestValidator.httpError(
    "ban record should be deleted",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.bans.erase(
        superAdminConnection,
        {
          banId: banRecord.id,
        },
      );
    },
  );
}
