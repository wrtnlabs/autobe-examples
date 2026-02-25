import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test the search functionality of the section list endpoint.
 * Tests case-insensitive partial matching across name and description fields.
 */
export async function test_api_section_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Create test sections with distinct names and descriptions
  const section1 = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: "Economic Policy",
        description: "Discussions about fiscal matters and economic policy",
      },
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: "Political Analysis",
        description: "In-depth political commentary and analysis",
      },
    },
  );
  typia.assert(section2);
  const section3 = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {
      body: {
        name: "Global Markets",
        description: "World economic trends and global economic news",
      },
    },
  );
  typia.assert(section3);
  // Test 1: Search by name - 'economic' should match 'Economic Policy' (name) and 'Global Markets' (description)
  const result1 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: { search: "economic" },
    },
  );
  typia.assert(result1);
  TestValidator.predicate(
    "search by 'economic' returns results",
    result1.data.length > 0,
  );
  const economicNames = result1.data.map((s) => s.name);
  TestValidator.predicate(
    "Economic Policy found",
    economicNames.includes("Economic Policy"),
  );
  // Test 2: Search by description - 'political' should match 'Political Analysis'
  const result2 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: { search: "political" },
    },
  );
  typia.assert(result2);
  TestValidator.predicate(
    "search by 'political' returns results",
    result2.data.length > 0,
  );
  const politicalNames = result2.data.map((s) => s.name);
  TestValidator.predicate(
    "Political Analysis found",
    politicalNames.includes("Political Analysis"),
  );
  // Test 3: Case-insensitive matching - 'ECONOMIC' (uppercase) should match
  const result3 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: { search: "ECONOMIC" },
    },
  );
  typia.assert(result3);
  TestValidator.predicate(
    "case-insensitive search returns results",
    result3.data.length > 0,
  );
  const uppercaseNames = result3.data.map((s) => s.name);
  TestValidator.predicate(
    "Economic Policy found with uppercase search",
    uppercaseNames.includes("Economic Policy"),
  );
  // Test 4: Partial matching - 'policy' should match 'Economic Policy'
  const result4 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: { search: "policy" },
    },
  );
  typia.assert(result4);
  TestValidator.predicate(
    "partial match 'policy' returns results",
    result4.data.length > 0,
  );
  const policyNames = result4.data.map((s) => s.name);
  TestValidator.predicate(
    "Economic Policy found with partial match",
    policyNames.includes("Economic Policy"),
  );
  // Test 5: No matches - 'nonexistent' should return empty array with records=0
  const result5 = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: { search: "nonexistent" },
    },
  );
  typia.assert(result5);
  TestValidator.equals("no match returns empty data", result5.data.length, 0);
  TestValidator.equals(
    "no match returns records=0",
    result5.pagination.records,
    0,
  );
}
