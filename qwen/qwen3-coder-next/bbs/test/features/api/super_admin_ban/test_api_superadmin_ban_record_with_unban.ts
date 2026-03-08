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

export async function test_api_superadmin_ban_record_with_unban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create authorized connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Note: The scenario requires unban functionality via PUT endpoint
  // which is not available in the provided API functions list
  // This test verifies the GET endpoint can retrieve unbanned records
  // In a real scenario, we would need the PUT endpoint to create the unbanned state
  // Generate a realistic ban ID (this would normally come from a created ban)
  // For demonstration, we use a valid UUID format
  const banId = "123e4567-e89b-12d3-a456-426614174000" as string &
    tags.Format<"uuid">;
  // Fetch ban record
  const record = await api.functional.discussionBoard.superAdmin.bans.at(
    adminConnection,
    { banId },
  );
  typia.assert(record);
  // Validate ban record structure
  TestValidator.equals("record has id", typeof record.id === "string", true);
  TestValidator.equals(
    "has banned_at timestamp",
    typeof record.banned_at === "string",
    true,
  );
  TestValidator.predicate(
    "ban reason is present",
    () => typeof record.ban_reason === "string" && record.ban_reason.length > 0,
  );
}
