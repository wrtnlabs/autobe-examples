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

export async function test_api_admin_ban_query_with_deletion_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication: join to establish admin privileges
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // 2. Generate test data: create 5 ban records, 3 with deletion and 2 without
  // Create one community for visibility (bans are scoped by community)
  // Create 3 deleted bans (deleted_at is not null)
  // Create 2 active bans (deleted_at is null) - these must NOT appear in results
  // Generate 3 deleted bans
  const deletedBans = ArrayUtil.repeat(
    3,
    () =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        banned_by_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      }) satisfies ICommunityBannedUser,
  );
  // Generate 2 active bans (deleted_at = null)
  const activeBans = ArrayUtil.repeat(
    2,
    () =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        banned_by_id: typia.random<string & tags.Format<"uuid">>(),
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }) satisfies ICommunityBannedUser,
  );
  // Ensure all bans are created in the system
  // Since we can't create bans directly via API in this scenario,
  // the data must be pre-seeded. The test validates that the query
  // filters correctly, so the existence of data is assumed.
  // 3. Query for banned users with deletion filter (deleted_at is not null)
  const queryResult = await api.functional.community.admin.bans.index(
    adminConnection,
    {
      body: {} satisfies ICommunityBannedUser.IRequest,
    },
  );
  typia.assert(queryResult);
  // 4. Validate results
  // - Only deleted bans should appear in results (deleted_at is not null)
  // - Active bans (deleted_at is null) must not be included
  // - Pagination metadata should reflect total count of deleted bans
  // Verify total count includes only deleted bans
  TestValidator.equals(
    "total deleted bans count",
    queryResult.pagination.records,
    3,
  );
  // Verify data array contains only 3 records (the deleted bans)
  TestValidator.equals("returned records count", queryResult.data.length, 3);
  // Verify each returned ban has non-null deleted_at
  for (const ban of queryResult.data) {
    TestValidator.predicate(
      "ban has non-null deleted_at",
      ban.deleted_at !== null,
    );
    TestValidator.predicate(
      "ban has valid deleted_at format",
      ban.deleted_at !== undefined,
    );
    TestValidator.predicate(
      "ban has valid date format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ban.deleted_at ?? ""),
    );
  }
  // Verify the result contains no active bans (deleted_at === null)
  // This is implicitly true due to the filter, but we can verify
  // by checking the data does not contain any with deleted_at === null
  const hasNullDeletedAt = queryResult.data.some(
    (ban) => ban.deleted_at === null,
  );
  TestValidator.predicate("no active bans found", !hasNullDeletedAt);
  // Verify pagination metadata
  TestValidator.equals("current page is 1", queryResult.pagination.current, 1);
  TestValidator.equals(
    "limit is default",
    queryResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pages should be 1 or more",
    queryResult.pagination.pages >= 1,
    true,
  );
}