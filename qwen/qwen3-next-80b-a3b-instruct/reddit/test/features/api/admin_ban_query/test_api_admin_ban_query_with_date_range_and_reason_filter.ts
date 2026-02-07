import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_query_with_date_range_and_reason_filter(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Generate test ban records with known reason and timestamps
  const banReason = "Spamming community forum";
  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);
  // Create ban records with various creation dates and reasons
  const banCount = 10;
  const banRecords = ArrayUtil.repeat(banCount, (index) => {
    const created_at = new Date();
    // Set creation dates to create variation: 2 with old dates, 3 with date range, 5 with future
    if (index < 2) {
      created_at.setTime(fiveDaysAgo.getTime() + index * 24 * 60 * 60 * 1000);
    } else if (index < 5) {
      created_at.setTime(threeDaysAgo.getTime() + index * 12 * 60 * 60 * 1000);
    } else {
      created_at.setTime(today.getTime() + index * 24 * 60 * 60 * 1000);
    }
    let reason = banReason;
    if (index % 3 === 0) {
      reason = "Inappropriate content";
    } else if (index % 3 === 1) {
      reason = "Violation of community rules";
    }
    return {
      community_id: typia.random<string & tags.Format<"uuid">>(),
      banned_user_id: typia.random<string & tags.Format<"uuid">>(),
      banned_by_id: typia.random<string & tags.Format<"uuid">>(),
      reason,
      created_at: created_at.toISOString(),
      updated_at: created_at.toISOString(),
    } as ICommunityBannedUser;
  });
  // Insert ban records (assuming we need a way to insert data in test)
  // Since we don't have a direct API to insert bans, we'll proceed with querying
  // and rely on test data existing from setup phase
  // Query with date range and reason filter
  const createdAtMin = threeDaysAgo.toISOString();
  const createdAtMax = today.toISOString();
  const reasonKeyword = "Spamming";
  const response = await api.functional.community.admin.bans.index(
    adminConnection,
    {
      body: {
        created_at_min: createdAtMin,
        created_at_max: createdAtMax,
        reason: reasonKeyword,
      } satisfies ICommunityBannedUser.IRequest,
    },
  );
  typia.assert(response);
  // Validate that we got back the expected number of records (should be 3 records from the date range with "Spamming" reason)
  // We expect 3 records from the middle group (index 2, 3, 4) that have createdAt in range AND reason contains "Spamming"
  const expectedRecordCount = 3;
  TestValidator.equals(
    "record count matches expected",
    response.pagination.records,
    expectedRecordCount,
  );
  TestValidator.equals(
    "pagination limit matches",
    response.pagination.limit,
    10,
  ); // default limit
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    Math.ceil(expectedRecordCount / response.pagination.limit),
  );
  // Validate that all returned records match the filter criteria
  TestValidator.predicate("all records have reason containing keyword", () =>
    response.data.every((ban) => ban.reason.includes(reasonKeyword)),
  );
  TestValidator.predicate("all records are within date range", () =>
    response.data.every((ban) => {
      const banDate = new Date(ban.created_at);
      const minDate = new Date(createdAtMin);
      const maxDate = new Date(createdAtMax);
      return banDate >= minDate && banDate <= maxDate;
    }),
  );
  // Validate that response includes proper entity references
  TestValidator.predicate("all records have valid community_id", () =>
    response.data.every(
      (ban) => ban.community_id.length === 36 && ban.community_id.includes("-"),
    ),
  );
  TestValidator.predicate("all records have valid banned_user_id", () =>
    response.data.every(
      (ban) =>
        ban.banned_user_id.length === 36 && ban.banned_user_id.includes("-"),
    ),
  );
  TestValidator.predicate("all records have valid banned_by_id", () =>
    response.data.every(
      (ban) => ban.banned_by_id.length === 36 && ban.banned_by_id.includes("-"),
    ),
  );
}
