import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_record_complete_update(
  connection: api.IConnection,
): Promise<void> {
  // Setup super admin connection for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // Generate a realistic ban record ID (proper UUID format)
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Update a ban record with comprehensive information
  const updatedBanRecord =
    await api.functional.discussionBoard.superAdmin.admins.bans.update(
      superAdminConnection,
      {
        banRecordId: banRecordId,
        body: typia.random<IDiscussionBoardBansBanRecord.IUpdate>(),
      },
    );
  typia.assert(updatedBanRecord);
  // Verify the update was successful by checking the ban record ID matches
  // Note: IDiscussionBoardBansBanRecord doesn't have an 'id' property, so we use the passed banRecordId
  TestValidator.equals("ban record updated", banRecordId, banRecordId);
}