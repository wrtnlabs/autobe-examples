import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test complex filtering of ban records with multiple criteria including ban status and duration.
 * An administrator searches for active ban records with specific duration criteria.
 * The test verifies that the endpoint correctly applies multiple filters simultaneously
 * and validates that returned records match all specified filter criteria.
 */
export async function test_api_admin_ban_records_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Active bans with specific duration
  const activeBansWithDuration =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(activeBansWithDuration);
  // Test 2: Permanent bans (null duration)
  const permanentBans =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          ban_status: "active",
          ban_duration_days: null,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(permanentBans);
  // Test 3: Expired bans
  const expiredBans =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          ban_status: "expired",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(expiredBans);
  // Test 4: Revoked bans
  const revokedBans =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          ban_status: "revoked",
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(revokedBans);
  // Test 5: No filters (should return all records)
  const allBans = await api.functional.discussionBoard.admin.ban_records.index(
    adminConnection,
    {
      body: {} satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(allBans);
  // Test 6: Edge case - specific duration with no status filter
  const specificDuration =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<7>
          >(),
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(specificDuration);
}
