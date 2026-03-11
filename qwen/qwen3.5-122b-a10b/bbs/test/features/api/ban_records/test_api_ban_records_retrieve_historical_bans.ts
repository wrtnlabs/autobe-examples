import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_ban_records_retrieve_historical_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Query ban records with isActive=false filter to get historical (unbanned) records
  const historicalBans =
    await api.functional.discussionBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(historicalBans);
  // 3. Validate response structure
  TestValidator.predicate("pagination exists", !!historicalBans.pagination);
  TestValidator.predicate(
    "data array exists",
    Array.isArray(historicalBans.data),
  );
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "current page is non-negative",
    historicalBans.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    historicalBans.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    historicalBans.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    historicalBans.pagination.pages >= 0,
  );
  // 5. If there are historical bans, validate each record
  if (historicalBans.data.length > 0) {
    const firstBan = historicalBans.data[0];
    // Validate ban record has required fields
    TestValidator.predicate("ban has id", !!firstBan.id);
    TestValidator.predicate("ban has reason", firstBan.reason.length > 0);
    TestValidator.predicate(
      "ban has banned_at timestamp",
      !!firstBan.banned_at,
    );
    // Validate unbanned_at is NOT null for historical bans (this is the key validation)
    TestValidator.predicate(
      "historical ban has unbanned_at timestamp",
      firstBan.unbanned_at !== null,
    );
    // Validate member summary exists
    TestValidator.predicate(
      "member summary exists",
      !!firstBan.discussionBoardMember,
    );
    TestValidator.predicate(
      "member has id",
      !!firstBan.discussionBoardMember.id,
    );
    TestValidator.predicate(
      "member has display_name",
      !!firstBan.discussionBoardMember.display_name,
    );
    TestValidator.predicate(
      "member has ban_status",
      !!firstBan.discussionBoardMember.ban_status,
    );
    TestValidator.predicate(
      "member has created_at",
      !!firstBan.discussionBoardMember.created_at,
    );
    // Validate admin summary exists
    TestValidator.predicate(
      "admin summary exists",
      !!firstBan.discussionBoardAdmin,
    );
    TestValidator.predicate("admin has id", !!firstBan.discussionBoardAdmin.id);
    TestValidator.predicate(
      "admin has display_name",
      !!firstBan.discussionBoardAdmin.display_name,
    );
    TestValidator.predicate(
      "admin has grade",
      !!firstBan.discussionBoardAdmin.grade,
    );
    TestValidator.predicate(
      "admin has created_at",
      !!firstBan.discussionBoardAdmin.created_at,
    );
  }
}
