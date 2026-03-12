import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an authenticated administrator can filter ban records to show only active bans for members.
 * 1. Authenticate as administrator using utility function
 * 2. Create actor-specific connection for API calls
 * 3. Filter ban records by actor_type='member' and status='active'
 * 4. Validate response structure and ban record properties
 * 5. Verify pagination metadata
 * 6. Test search functionality on ban_reason
 */
export async function test_api_ban_record_list_active_member_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Query ban records with filters for active member bans
  const response =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          status: "active",
          limit: 20,
          page: 1,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals(
    "has pagination object",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("has data array", response.data !== undefined, true);
  TestValidator.equals("page limit matches", response.pagination.limit, 20);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  // 4. Validate all returned ban records are active member bans
  await ArrayUtil.asyncForEach(response.data, async (banRecord) => {
    typia.assert(banRecord);
    // Verify actor_type is 'member'
    TestValidator.equals(
      "actor_type is member",
      banRecord.actor_type,
      "member",
    );
    // Verify ban is active (unbanned_at is null)
    TestValidator.equals(
      "ban is active (unbanned_at is null)",
      banRecord.unbanned_at,
      null,
    );
    // Verify required fields exist
    TestValidator.predicate("has ban_reason", banRecord.ban_reason.length > 0);
    TestValidator.predicate(
      "has banned_at timestamp",
      banRecord.banned_at.length > 0,
    );
    TestValidator.predicate(
      "has bannedBy administrator",
      banRecord.bannedBy !== null,
    );
    // Verify bannedBy structure
    typia.assert(banRecord.bannedBy);
    TestValidator.predicate(
      "bannedBy has id",
      banRecord.bannedBy.id.length > 0,
    );
    TestValidator.predicate(
      "bannedBy has email",
      banRecord.bannedBy.email.length > 0,
    );
  });
  // 5. Test search functionality with ban_reason filter
  const searchResponse =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          status: "active",
          search: "spam",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate search results
  TestValidator.equals(
    "search response has pagination",
    searchResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "search page limit matches",
    searchResponse.pagination.limit,
    10,
  );
  // Verify all search results still match the base filters
  await ArrayUtil.asyncForEach(searchResponse.data, async (banRecord) => {
    typia.assert(banRecord);
    TestValidator.equals(
      "search result actor_type is member",
      banRecord.actor_type,
      "member",
    );
    TestValidator.equals(
      "search result ban is active",
      banRecord.unbanned_at,
      null,
    );
  });
  // 6. Test pagination with different page number
  const page2Response =
    await api.functional.discussionBoard.administrator.banRecords.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          status: "active",
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 has valid records count",
    page2Response.pagination.records >= 0,
  );
}
