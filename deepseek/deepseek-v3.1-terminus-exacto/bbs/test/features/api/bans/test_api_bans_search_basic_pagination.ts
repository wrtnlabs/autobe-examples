import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test basic ban search functionality with pagination.
 * 1. Create administrator account and authenticate
 * 2. Create multiple ban records for testing
 * 3. Test pagination with different page and limit parameters
 * 4. Validate pagination metadata and ban summary structure
 */
export async function test_api_bans_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
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
  // 2. Create multiple ban records
  const banRecords = await Promise.all(
    ArrayUtil.repeat(5, (index) =>
      generate_random_discussion_board_admin_bans_create(adminConnection, {
        body: {
          banned_user_id: typia.random<string & tags.Format<"uuid">>(),
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_type: index % 2 === 0 ? "temporary" : "permanent",
          ban_duration_days:
            index % 2 === 0
              ? typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1> &
                    tags.Maximum<30>
                >()
              : undefined,
        } satisfies IDiscussionBoardUserBan.ICreate,
      }),
    ),
  );
  // 3. Test pagination with page 1 and limit 2
  const page1Result = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(page1Result);
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 records total",
    page1Result.pagination.records >= 5,
  );
  TestValidator.predicate(
    "page 1 total pages",
    page1Result.pagination.pages >= 3,
  );
  TestValidator.equals("page 1 data length", page1Result.data.length, 2);
  // 4. Test pagination with page 2 and limit 2
  const page2Result = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 2);
  TestValidator.equals(
    "page 2 records total",
    page2Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.equals(
    "page 2 total pages",
    page2Result.pagination.pages,
    page1Result.pagination.pages,
  );
  TestValidator.equals("page 2 data length", page2Result.data.length, 2);
  // 5. Test that different pages return different records
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const page1Ids = page1Result.data.map((ban) => ban.id);
    const page2Ids = page2Result.data.map((ban) => ban.id);
    // Ensure no overlap between pages
    page1Ids.forEach((id) => {
      TestValidator.predicate(
        `page 1 ID ${id} not in page 2`,
        !page2Ids.includes(id),
      );
    });
  }
  // 6. Test pagination with page 3 and larger limit to get remaining records
  const page3Result = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(page3Result);
  TestValidator.equals(
    "page 3 current page",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3Result.pagination.limit, 10);
  TestValidator.equals(
    "page 3 records total",
    page3Result.pagination.records,
    page1Result.pagination.records,
  );
  TestValidator.predicate(
    "page 3 data length <= limit",
    page3Result.data.length <= 10,
  );
  // 7. Validate ban summary structure
  if (page1Result.data.length > 0) {
    const banSummary = page1Result.data[0];
    TestValidator.predicate(
      "ban summary has id",
      typeof banSummary.id === "string",
    );
    TestValidator.predicate(
      "ban summary has ban_reason",
      typeof banSummary.ban_reason === "string",
    );
    TestValidator.predicate(
      "ban summary has ban_duration_type",
      typeof banSummary.ban_duration_type === "string",
    );
    TestValidator.predicate(
      "ban summary has ban_status",
      typeof banSummary.ban_status === "string",
    );
    TestValidator.predicate(
      "ban summary has appeal_status",
      typeof banSummary.appeal_status === "string",
    );
    TestValidator.predicate(
      "ban summary has ban_started_at",
      typeof banSummary.ban_started_at === "string",
    );
    TestValidator.predicate(
      "ban summary has bannedUser",
      typeof banSummary.bannedUser === "object",
    );
    TestValidator.predicate(
      "ban summary has banningAdministrator",
      typeof banSummary.banningAdministrator === "object",
    );
    // Validate nested user summary structure
    TestValidator.predicate(
      "bannedUser has id",
      typeof banSummary.bannedUser.id === "string",
    );
    TestValidator.predicate(
      "bannedUser has display_name",
      typeof banSummary.bannedUser.display_name === "string",
    );
    TestValidator.predicate(
      "bannedUser has bio",
      banSummary.bannedUser.bio === null ||
        typeof banSummary.bannedUser.bio === "string",
    );
    TestValidator.predicate(
      "bannedUser has created_at",
      typeof banSummary.bannedUser.created_at === "string",
    );
    TestValidator.predicate(
      "bannedUser has updated_at",
      typeof banSummary.bannedUser.updated_at === "string",
    );
    // Validate nested administrator summary structure
    TestValidator.predicate(
      "banningAdministrator has id",
      typeof banSummary.banningAdministrator.id === "string",
    );
    TestValidator.predicate(
      "banningAdministrator has email",
      typeof banSummary.banningAdministrator.email === "string",
    );
    TestValidator.predicate(
      "banningAdministrator has display_name",
      typeof banSummary.banningAdministrator.display_name === "string",
    );
    TestValidator.predicate(
      "banningAdministrator has created_at",
      typeof banSummary.banningAdministrator.created_at === "string",
    );
  }
}
