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

/**
 * Test admin ban records listing endpoint with historical unbanned ban filtering.
 *
 * Validates the business workflow for moderators to review past ban activity and unbanning decisions.
 * Ensures that the ban records correctly filter by unbanned status and include complete historical
 * information including unban timestamps and all referenced entities.
 *
 * 1. Administrator authenticates by joining the admin account.
 * 2. Admin calls the ban records index endpoint with ban_status='unbanned' filter.
 * 3. System returns paginated list of historical bans where users have been unbanned.
 * 4. Response includes complete ban history with unban timestamps and metadata.
 *
 * 4.1. Verify ban_status='unbanned' filter returns only bans with unban_at IS NOT NULL.
 * 4.2. Confirm unban_at timestamps are present and populated for all returned records.
 * 4.3. Verify historical ban records include all fields: id, reason, banned_at, unban_at, user, community, bannedBy.
 * 4.4. Check that community and user references are correctly resolved even for historical bans.
 * 4.5. Validate pagination metadata accurately reflects total unbanned record count.
 * 4.6. Test with different date range filters (banned_at_from, banned_at_to) to narrow historical results.
 * 4.7. Verify that records can be ordered by user_id instead of default banned_at.
 * 4.8. Test with custom pagination parameters (limit=50, offset=20).
 */
export async function test_api_ban_records_list_unbanned_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test with ban_status='unbanned' filter
  const unbannedRecords = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_status: "unbanned",
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(unbannedRecords);
  // 3. Validate pagination metadata structure
  const pagination = unbannedRecords.pagination;
  TestValidator.predicate(
    "pagination current is a positive number",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is a positive number",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is a positive number",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is a non-negative number",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // 4. Validate each unbanned record has unban_at populated (not null)
  if (unbannedRecords.data.length > 0) {
    unbannedRecords.data.forEach((record, index) => {
      TestValidator.notEquals(
        `record ${index} has unban_at`,
        record.unban_at,
        null,
      );
      // Assert unban_at is valid date-time
      typia.assert(record.unban_at!);
    });
  }
  // 5. Validate record structure contains all required fields
  if (unbannedRecords.data.length > 0) {
    const sampleRecord = unbannedRecords.data[0];
    typia.assert(sampleRecord);
    // Validate user reference exists
    typia.assert(sampleRecord.user);
    TestValidator.notEquals("user has id", sampleRecord.user.id, null);
    TestValidator.notEquals(
      "user has username",
      sampleRecord.user.username,
      null,
    );
    // Validate community reference exists
    typia.assert(sampleRecord.community);
    TestValidator.notEquals(
      "community has id",
      sampleRecord.community.id,
      null,
    );
    TestValidator.notEquals(
      "community has name",
      sampleRecord.community.name,
      null,
    );
    // Validate bannedBy reference exists
    typia.assert(sampleRecord.bannedBy);
    TestValidator.notEquals("bannedBy has id", sampleRecord.bannedBy.id, null);
    TestValidator.notEquals(
      "bannedBy has username",
      sampleRecord.bannedBy.username,
      null,
    );
  }
  // 6. Test date range filter (banned_at_from)
  const bannedAtFrom = typia.random<string & tags.Format<"date-time">>();
  const filteredByDate = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_status: "unbanned",
        banned_at_from: bannedAtFrom,
        limit: 100,
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "date filtered results are valid",
    filteredByDate.data.every((r) => {
      const banDate = new Date(r.banned_at).getTime();
      const fromDate = new Date(bannedAtFrom).getTime();
      return banDate >= fromDate;
    }),
  );
  // 7. Test order_by=user_id
  const orderedByUser = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_status: "unbanned",
        order_by: "user_id",
        limit: 100,
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(orderedByUser);
  // 8. Test custom pagination (limit=50, offset=20)
  const paginatedResult = await api.functional.redditCommunity.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_status: "unbanned",
        limit: 50,
        offset: 20,
      } satisfies IRedditCommunityBanRecord.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit is 50",
    paginatedResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination current is a positive number",
    typeof paginatedResult.pagination.current === "number" &&
      paginatedResult.pagination.current >= 0,
  );
}
