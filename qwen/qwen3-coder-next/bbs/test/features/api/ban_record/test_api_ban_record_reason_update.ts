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

export async function test_api_ban_record_reason_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {} satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Use a sample ban record ID for testing
  const banRecordId = "00000000-0000-0000-0000-000000000000";
  // 3. Update the ban record reason
  const updatedReason = "Test ban reason updated";
  const output =
    await api.functional.discussionBoard.superAdmin.admins.bans.update(
      superAdminConnection,
      {
        banRecordId,
        body: {
          reason: updatedReason,
        } satisfies IDiscussionBoardBansBanRecord.IUpdate,
      },
    );
  typia.assert(output);
  // 4. Verify the response is valid
  TestValidator.predicate("ban record is not null", output !== null);
}
