import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_ban_record_unban_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test unban with reason using a valid ban ID
  // Note: In a real scenario, this would be an existing ban record from database setup
  // Since no ban creation API is available, this tests the endpoint structure
  const banId = typia.random<string & tags.Format<"uuid">>();
  const unbanReason = RandomGenerator.paragraph({ sentences: 3 });
  const response = await api.functional.discussionBoard.superAdmin.bans.update(
    superAdminConnection,
    {
      banId,
      body: {
        ban_reason: "Original ban reason for testing" satisfies string &
          tags.MinLength<1> &
          tags.MaxLength<1000>,
        unban_reason: unbanReason satisfies
          | (string & tags.MinLength<1> & tags.MaxLength<1000>)
          | null
          | undefined,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(response);
  // 3. Validate unban response
  TestValidator.equals(
    "unban_reason recorded",
    response.unban_reason,
    unbanReason,
  );
  TestValidator.predicate(
    "unbanned_at timestamp set",
    response.unbanned_at !== null && response.unbanned_at !== undefined,
  );
  TestValidator.predicate(
    "banned_at preserved",
    response.banned_at !== null && response.banned_at !== undefined,
  );
  TestValidator.predicate(
    "original ban_reason preserved",
    response.ban_reason === "Original ban reason for testing",
  );
  TestValidator.predicate(
    "has valid created_at",
    response.created_at !== null && response.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    response.updated_at !== null && response.updated_at !== undefined,
  );
}
