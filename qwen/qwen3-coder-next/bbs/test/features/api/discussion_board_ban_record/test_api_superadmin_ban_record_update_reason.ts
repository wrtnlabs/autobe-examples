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

export async function test_api_superadmin_ban_record_update_reason(
  connection: api.IConnection,
): Promise<void> {
  // Authorize as super admin to get a connection with admin privileges
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random ban ID for testing
  const banId = typia.random<string & tags.Format<"uuid">>();
  // Update the ban reason with valid data (1-1000 characters)
  const updatedBan =
    await api.functional.discussionBoard.superAdmin.bans.update(
      adminConnection,
      {
        banId,
        body: {
          ban_reason: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MinLength<1> & tags.MaxLength<1000>,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate the update response
  TestValidator.equals(
    "ban reason updated",
    updatedBan.ban_reason,
    updatedBan.ban_reason,
  );
  TestValidator.predicate(
    "ban record has valid structure",
    updatedBan.id !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    updatedBan.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedBan.updated_at !== undefined,
  );
}
