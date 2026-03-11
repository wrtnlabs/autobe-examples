import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

export async function test_api_ban_list_search_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create 3 member accounts with distinct characteristics
  const member1Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: "alice.test@example.com",
        password: "TestPassword123!",
        display_name: "Alice Johnson",
        bio: "Software developer",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member1Auth);
  const member2Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: "bob.smith@example.com",
        password: "TestPassword123!",
        display_name: "Bob Smith",
        bio: "Product manager",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member2Auth);
  const member3Auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: "charlie.brown@example.com",
        password: "TestPassword123!",
        display_name: "Charlie Brown",
        bio: "Designer",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member3Auth);
  // 3. Create 3 ban records with different reasons
  const ban1 = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member1Auth.id,
        reason: "Spam violation - posting promotional content repeatedly",
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban1);
  const ban2 = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member2Auth.id,
        reason: "Harassment - inappropriate comments toward other users",
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban2);
  const ban3 = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: member3Auth.id,
        reason: "Community guidelines violation - offensive language",
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban3);
  // 4. Test search by display name (OR matching across name, email, reason)
  const searchByName = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "Alice",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(searchByName);
  TestValidator.predicate("search by name returns Alice", () =>
    searchByName.data.some(
      (ban) => ban.member.display_name === "Alice Johnson",
    ),
  );
  // 5. Test search by email
  const searchByEmail = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "bob.smith",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(searchByEmail);
  TestValidator.predicate("search by email returns Bob", () =>
    searchByEmail.data.some((ban) => ban.member.display_name === "Bob Smith"),
  );
  // 6. Test search by ban reason text
  const searchByReason = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "Spam",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(searchByReason);
  TestValidator.predicate("search by reason returns spam ban", () =>
    searchByReason.data.some((ban) => ban.reason.includes("Spam")),
  );
  // 7. Test date range filtering (from timestamp)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const searchByDateFrom =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        from: yesterday.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(searchByDateFrom);
  // 8. Test date range filtering (to timestamp)
  const searchByDateTo = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        to: tomorrow.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(searchByDateTo);
  TestValidator.equals(
    "date to filter returns all 3 bans",
    searchByDateTo.data.length,
    3,
  );
  // 9. Test sorting by banned_at descending
  const sortByBannedAtDesc =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(sortByBannedAtDesc);
  // 10. Test sorting by display_name ascending
  const sortByDisplayNameAsc =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        sort: "display_name",
        direction: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    });
  typia.assert(sortByDisplayNameAsc);
  // 11. Test pagination - page 1 with limit 2
  const paginatedResult = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "total records correct",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages correct",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  // 12. Test pagination - page 2
  const page2Result = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 has 1 ban", page2Result.data.length, 1);
  TestValidator.equals(
    "page 2 current page",
    page2Result.pagination.current,
    2,
  );
  // 13. Test combined search and sort
  const combinedSearch = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "violation",
        sort: "banned_at",
        direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate("combined search returns matching bans", () =>
    combinedSearch.data.every(
      (ban) =>
        ban.reason.toLowerCase().includes("violation") ||
        ban.member.display_name.toLowerCase().includes("violation"),
    ),
  );
}