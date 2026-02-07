import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering ban records by different ban statuses.
 * 1. Authenticate as super administrator
 * 2. Search for bans with different status filters
 * 3. Validate that returned records match the filter criteria
 * 4. Test that each status filter returns appropriate results
 */
export async function test_api_superadmin_ban_records_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // Test active ban status filter
  const activeBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_status: "active",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(activeBans);
  // Validate all active bans have 'active' status
  for (const banRecord of activeBans.data) {
    TestValidator.equals("active ban status", banRecord.ban_status, "active");
  }
  // Test expired ban status filter
  const expiredBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(expiredBans);
  // Validate all expired bans have 'expired' status
  for (const banRecord of expiredBans.data) {
    TestValidator.equals("expired ban status", banRecord.ban_status, "expired");
  }
  // Test revoked ban status filter
  const revokedBans =
    await api.functional.discussionBoard.superAdmin.ban_records.index(
      superAdminConnection,
      {
        body: {
          ban_status: "revoked",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(revokedBans);
  // Validate all revoked bans have 'revoked' status
  for (const banRecord of revokedBans.data) {
    TestValidator.equals("revoked ban status", banRecord.ban_status, "revoked");
  }
}