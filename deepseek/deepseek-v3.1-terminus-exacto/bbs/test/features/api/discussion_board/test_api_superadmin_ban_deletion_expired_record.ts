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

export async function test_api_superadmin_ban_deletion_expired_record(
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
  // Create a ban that is already expired by setting ban_ends_at to a past date
  // We need to create a temporary ban that ended yesterday
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const expiredBan =
    await generate_random_discussion_board_super_admin_bans_create(
      superAdminConnection,
      {
        body: {
          banned_user_id: typia.random<string & tags.Format<"uuid">>(),
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_type: "temporary",
          ban_duration_days: 1, // 1 day ban that should have ended
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(expiredBan);
  // Verify the ban has an expiration date in the past
  TestValidator.predicate(
    "ban should have ended in the past",
    expiredBan.ban_ends_at !== null &&
      expiredBan.ban_ends_at !== undefined &&
      new Date(expiredBan.ban_ends_at) < new Date(),
  );
  // Delete the expired ban record
  const deletedBan = await api.functional.discussionBoard.superAdmin.bans.erase(
    superAdminConnection,
    {
      banId: expiredBan.id,
    },
  );
  typia.assert(deletedBan);
  // Validate that the deleted ban record matches the original
  TestValidator.equals(
    "deleted ban ID should match original",
    deletedBan.id,
    expiredBan.id,
  );
  TestValidator.equals(
    "deleted ban reason should match",
    deletedBan.ban_reason,
    expiredBan.ban_reason,
  );
  TestValidator.equals(
    "deleted ban duration type should match",
    deletedBan.ban_duration_type,
    expiredBan.ban_duration_type,
  );
}
