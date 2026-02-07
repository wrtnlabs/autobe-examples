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

export async function test_api_ban_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Create a ban record to retrieve
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
  // Retrieve the ban record using the target operation
  const retrievedBan = await api.functional.discussionBoard.superAdmin.bans.at(
    superAdminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate comprehensive ban information
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.predicate(
    "ban_status is valid",
    retrievedBan.ban_status.length > 0,
  );
  TestValidator.notEquals("created_at is set", retrievedBan.created_at, null);
  TestValidator.notEquals("updated_at is set", retrievedBan.updated_at, null);
  // Validate optional fields that should be present for temporary bans
  if (
    retrievedBan.ban_duration_days !== undefined &&
    retrievedBan.ban_duration_days !== null
  ) {
    TestValidator.predicate(
      "ban_duration_days is positive",
      retrievedBan.ban_duration_days > 0,
    );
  }
  if (
    retrievedBan.expires_at !== undefined &&
    retrievedBan.expires_at !== null
  ) {
    TestValidator.predicate(
      "expires_at is valid date",
      !isNaN(new Date(retrievedBan.expires_at).getTime()),
    );
  }
  // Validate that revoked fields are null for a new ban
  TestValidator.equals(
    "revoked_at is null for new ban",
    retrievedBan.revoked_at,
    null,
  );
  TestValidator.equals(
    "revoked_reason is null for new ban",
    retrievedBan.revoked_reason,
    null,
  );
}
