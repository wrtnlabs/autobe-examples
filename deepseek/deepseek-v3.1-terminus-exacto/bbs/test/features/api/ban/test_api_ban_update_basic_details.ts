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

export async function test_api_ban_update_basic_details(
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
  // Create initial ban record
  const initialBan =
    await generate_random_discussion_board_super_admin_bans_create(
      superAdminConnection,
      {
        body: {
          banned_user_id: typia.random<string & tags.Format<"uuid">>(),
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_type: "temporary",
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // Update ban record with new details
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      superAdminConnection,
      {
        banId: initialBan.id,
        body: {
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<60>
          >(),
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Verify updated fields
  TestValidator.notEquals(
    "ban reason should be updated",
    updatedBan.ban_reason,
    initialBan.ban_reason,
  );
  TestValidator.notEquals(
    "ban duration should be updated",
    updatedBan.ban_duration_days,
    initialBan.ban_duration_days,
  );
  // Verify unchanged fields
  TestValidator.equals(
    "ban status should remain unchanged",
    updatedBan.ban_status,
    "active",
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedBan.created_at,
    initialBan.created_at,
  );
  // Verify updated_at timestamp is newer
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedBan.updated_at) > new Date(updatedBan.created_at),
  );
}
