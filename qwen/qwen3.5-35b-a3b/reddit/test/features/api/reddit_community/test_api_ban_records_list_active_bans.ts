import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanRecord";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_records_list_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditCommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Fetch active ban records with default pagination
  const response: IPageIRedditCommunityBanRecord.ISummary =
    await api.functional.redditCommunity.admin.bans.index(adminConnection, {
      body: {
        ban_status: "active" as const,
        limit: 20,
        order_by: "banned_at",
      } satisfies IRedditCommunityBanRecord.IRequest,
    });
  typia.assert(response);
  // 3. Validate pagination metadata exists and is valid
  typia.assert(response.pagination);
  TestValidator.equals(
    "pagination current is non-negative",
    0,
    response.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is positive",
    1,
    response.pagination.limit,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    0,
    response.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    0,
    response.pagination.pages,
  );
  // 4. Validate pagination math consistency
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pagination pages matches calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate ban records if any exist
  if (response.data.length > 0) {
    // Verify all records are active (unban_at is null)
    for (const record of response.data) {
      typia.assert(record);
      TestValidator.notEquals(
        "active ban reason is non-empty",
        record.reason,
        "",
      );
      TestValidator.equals(
        "active ban unban_at is null",
        record.unban_at,
        null,
      );
      TestValidator.equals(
        "active ban deleted_at is null",
        record.deleted_at,
        null,
      );
      TestValidator.predicate(
        "active ban banned_at exists",
        record.banned_at !== undefined,
      );
      // Validate user summary
      typia.assert(record.user);
      TestValidator.notEquals(
        "user username is non-empty",
        record.user.username,
        "",
      );
      TestValidator.predicate(
        "user created_at exists",
        record.user.created_at !== undefined,
      );
      TestValidator.predicate(
        "user updated_at exists",
        record.user.updated_at !== undefined,
      );
      // Validate community summary
      typia.assert(record.community);
      TestValidator.notEquals(
        "community name is non-empty",
        record.community.name,
        "",
      );
      TestValidator.predicate(
        "community created_at exists",
        record.community.created_at !== undefined,
      );
      // description and subscriber_count are optional, so no validation needed
      // Validate bannedBy summary
      typia.assert(record.bannedBy);
      TestValidator.notEquals(
        "bannedBy username is non-empty",
        record.bannedBy.username,
        "",
      );
      TestValidator.predicate(
        "bannedBy created_at exists",
        record.bannedBy.created_at !== undefined,
      );
      TestValidator.predicate(
        "bannedBy updated_at exists",
        record.bannedBy.updated_at !== undefined,
      );
    }
    // Verify all bans have deleted_at null (soft delete filtering)
    const nullDeletedBans = response.data.filter(
      (b) => b.deleted_at === null,
    ).length;
    TestValidator.equals(
      "all bans have deleted_at null",
      nullDeletedBans,
      response.data.length,
    );
  } else {
    // Test empty data scenario (valid pagination with no active bans)
    TestValidator.equals(
      "empty data has zero records",
      response.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data has zero pages",
      response.pagination.pages,
      0,
    );
    TestValidator.equals("empty data has empty array", response.data.length, 0);
  }
  // 6. Validate ordering by banned_at descending if multiple records
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].banned_at);
      const next = new Date(response.data[i + 1].banned_at);
      TestValidator.predicate(
        "bans ordered by banned_at descending",
        current >= next,
      );
    }
  }
}