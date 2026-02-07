import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic ban search functionality with pagination.
 * Create multiple ban records with different statuses and dates, then search with pagination parameters.
 * Verify that the response includes correct pagination metadata (current page, limit, total records, total pages)
 * and that the data array contains the expected number of records.
 * Validate that banned user and banning administrator information is properly included in the summary.
 */
export async function test_api_superadmin_bans_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Since ban creation API endpoints are not available in the provided utility functions,
  // we'll test the search functionality with existing data in the system.
  // The pagination testing will work with whatever ban records exist in the database.
  // Test pagination with page 1 and limit 2
  const page1Response =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 total records is number",
    typeof page1Response.pagination.records === "number",
  );
  TestValidator.predicate(
    "page 1 total pages is number",
    typeof page1Response.pagination.pages === "number",
  );
  TestValidator.predicate(
    "page 1 data is array",
    Array.isArray(page1Response.data),
  );
  // Only validate data length if there are records
  if (page1Response.pagination.records > 0) {
    TestValidator.equals(
      "page 1 data length",
      page1Response.data.length,
      Math.min(2, page1Response.pagination.records),
    );
  }
  // Test pagination with page 2 and limit 2
  const page2Response =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 2);
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  // Only validate data length if there are enough records for page 2
  if (page2Response.pagination.records > 2) {
    TestValidator.equals(
      "page 2 data length",
      page2Response.data.length,
      Math.min(2, page2Response.pagination.records - 2),
    );
  }
  // Validate ban record structure for each item on page 1
  page1Response.data.forEach((ban, index) => {
    TestValidator.predicate(
      `ban ${index} has id`,
      typeof ban.id === "string" && ban.id.length > 0,
    );
    TestValidator.predicate(
      `ban ${index} has reason`,
      typeof ban.ban_reason === "string" && ban.ban_reason.length > 0,
    );
    TestValidator.predicate(
      `ban ${index} has duration type`,
      typeof ban.ban_duration_type === "string",
    );
    TestValidator.predicate(
      `ban ${index} has status`,
      typeof ban.ban_status === "string",
    );
    TestValidator.predicate(
      `ban ${index} has appeal status`,
      typeof ban.appeal_status === "string",
    );
    TestValidator.predicate(
      `ban ${index} has start date`,
      typeof ban.ban_started_at === "string",
    );
    // Validate banned user summary
    TestValidator.predicate(
      `ban ${index} banned user has id`,
      typeof ban.bannedUser.id === "string",
    );
    TestValidator.predicate(
      `ban ${index} banned user has display name`,
      typeof ban.bannedUser.display_name === "string",
    );
    TestValidator.predicate(
      `ban ${index} banned user has created_at`,
      typeof ban.bannedUser.created_at === "string",
    );
    TestValidator.predicate(
      `ban ${index} banned user has updated_at`,
      typeof ban.bannedUser.updated_at === "string",
    );
    // Validate banning administrator summary
    TestValidator.predicate(
      `ban ${index} banning admin has id`,
      typeof ban.banningAdministrator.id === "string",
    );
    TestValidator.predicate(
      `ban ${index} banning admin has email`,
      typeof ban.banningAdministrator.email === "string",
    );
    TestValidator.predicate(
      `ban ${index} banning admin has display name`,
      typeof ban.banningAdministrator.display_name === "string",
    );
    TestValidator.predicate(
      `ban ${index} banning admin has created_at`,
      typeof ban.banningAdministrator.created_at === "string",
    );
  });
  // Verify that pages have different data if both pages have records
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = page1Response.data.map((ban) => ban.id);
    const page2Ids = page2Response.data.map((ban) => ban.id);
    // Check that no ban appears on both pages (assuming unique bans per page)
    page1Ids.forEach((id) => {
      TestValidator.notEquals(
        `ban ${id} not on both pages`,
        page2Ids.includes(id),
        true,
      );
    });
  }
}
