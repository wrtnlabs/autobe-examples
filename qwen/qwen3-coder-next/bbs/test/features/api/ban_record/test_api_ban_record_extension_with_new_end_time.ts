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

export async function test_api_ban_record_extension_with_new_end_time(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Login as super admin to gain authorization
  // Note: The join endpoint creates a new super admin account
  // For testing purposes, we use random data since the DTO is empty
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // Step 2: Create a ban record first (in a real scenario)
  // Since we need to extend an existing ban, we'll use a random UUID
  // In production, this would come from a previous test setup
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Extend the ban record with new end time
  const extendedBan =
    await api.functional.discussionBoard.superAdmin.admins.bans.update(
      superAdminConnection,
      {
        banRecordId: banRecordId,
        body: typia.random<IDiscussionBoardBansBanRecord.IUpdate>(),
      },
    );
  // Step 4: Validate the response
  typia.assert(extendedBan);
}
