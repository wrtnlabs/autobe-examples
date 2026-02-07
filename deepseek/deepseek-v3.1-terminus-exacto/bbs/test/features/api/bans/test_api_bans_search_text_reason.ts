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
 * Test text search functionality on ban reasons.
 * Create ban records with different reason texts containing specific keywords.
 * Test partial matching, case sensitivity, and special character handling in ban reason searches.
 * Verify that the search returns only records containing the search term in their ban reason field.
 * Test edge cases like empty search terms, very long search terms, and search terms that match multiple records.
 */
export async function test_api_bans_search_text_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create multiple ban records with different reason texts
  const banReasons = [
    "User violated community guidelines by posting inappropriate content",
    "Multiple spam posts detected in the discussion board",
    "Harassment towards other users in the politics section",
    "Posting fake news about current affairs",
    "Repeated violations of the economy section rules",
  ];
  const createdBans: IDiscussionBoardUserBan[] = [];
  for (const reason of banReasons) {
    // Use the admin's ID as banned user ID for simplicity (since we can't create actual users)
    // This assumes the system allows banning administrators (which might not be ideal but works for testing)
    const ban = await generate_random_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          banned_user_id: adminAuth.id, // Use admin's own ID to avoid foreign key issues
          ban_reason: reason,
          ban_duration_type: "permanent",
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
    typia.assert(ban);
    createdBans.push(ban);
  }
  // Test 1: Search for "violated" - should match first ban
  const search1 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "violated",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search1);
  TestValidator.equals(
    "search 'violated' returns 1 result",
    search1.data.length,
    1,
  );
  TestValidator.predicate(
    "ban reason contains search term",
    search1.data[0].ban_reason.includes("violated"),
  );
  // Test 2: Search for "spam" - should match second ban
  const search2 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "spam",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search2);
  TestValidator.equals(
    "search 'spam' returns 1 result",
    search2.data.length,
    1,
  );
  TestValidator.predicate(
    "ban reason contains search term",
    search2.data[0].ban_reason.includes("spam"),
  );
  // Test 3: Search for "politics" - should match third ban
  const search3 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "politics",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search3);
  TestValidator.equals(
    "search 'politics' returns 1 result",
    search3.data.length,
    1,
  );
  TestValidator.predicate(
    "ban reason contains search term",
    search3.data[0].ban_reason.includes("politics"),
  );
  // Test 4: Search for "fake" - should match fourth ban
  const search4 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "fake",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search4);
  TestValidator.equals(
    "search 'fake' returns 1 result",
    search4.data.length,
    1,
  );
  TestValidator.predicate(
    "ban reason contains search term",
    search4.data[0].ban_reason.includes("fake"),
  );
  // Test 5: Search for "economy" - should match fifth ban
  const search5 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "economy",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search5);
  TestValidator.equals(
    "search 'economy' returns 1 result",
    search5.data.length,
    1,
  );
  TestValidator.predicate(
    "ban reason contains search term",
    search5.data[0].ban_reason.includes("economy"),
  );
  // Test 6: Search for "post" - should match multiple bans (first, second, fourth)
  const search6 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "post",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search6);
  TestValidator.predicate(
    "search 'post' returns multiple results",
    search6.data.length >= 2,
  );
  // Test 7: Empty search term - should return all bans
  const search7 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search7);
  TestValidator.equals(
    "empty search returns all bans",
    search7.data.length,
    banReasons.length,
  );
  // Test 8: Search with very long term - should return no results
  const longSearchTerm = "a".repeat(1000);
  const search8 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: longSearchTerm,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search8);
  TestValidator.equals(
    "long search term returns no results",
    search8.data.length,
    0,
  );
  // Test 9: Search with special characters
  const search9 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "community-guidelines",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search9);
  TestValidator.predicate(
    "search with hyphen returns at least 1 result",
    search9.data.length >= 1,
  );
  // Test 10: Case sensitivity test - search with different case
  const search10 = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: "VIOLATED", // uppercase
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(search10);
  // The result depends on whether search is case-sensitive or not
  TestValidator.predicate(
    "case sensitivity test returns reasonable results",
    search10.data.length === 0 || search10.data.length === 1,
  );
}
