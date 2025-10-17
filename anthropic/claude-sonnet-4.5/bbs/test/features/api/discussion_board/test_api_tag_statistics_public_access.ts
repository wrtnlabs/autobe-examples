import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardTagStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTagStatistics";

/**
 * Test that tag statistics can be retrieved publicly without authentication.
 *
 * This test validates the public accessibility of tag statistics endpoints,
 * ensuring that any user (guest, member, moderator, administrator) can access
 * aggregated tag statistics to understand tag usage patterns and popularity.
 *
 * Steps:
 *
 * 1. Create an administrator account to gain tag creation privileges
 * 2. Create a test tag using administrator credentials
 * 3. Create an unauthenticated connection (empty headers)
 * 4. Retrieve tag statistics without authentication
 * 5. Validate that statistics include all expected metrics
 * 6. Verify that the statistics reference the correct tag
 */
export async function test_api_tag_statistics_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for tag creation privileges
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuthorized: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuthorized);

  // Step 2: Create a test tag using administrator credentials
  const tagData = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tagData,
    });
  typia.assert(createdTag);

  // Step 3: Create unauthenticated connection to simulate guest access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve tag statistics without authentication
  const tagStatistics: IDiscussionBoardTagStatistics =
    await api.functional.discussionBoard.tags.statistics.at(
      unauthenticatedConnection,
      {
        tagId: createdTag.id,
      },
    );
  typia.assert(tagStatistics);

  // Step 5: Validate statistics structure and reference
  TestValidator.equals(
    "tag statistics references correct tag",
    tagStatistics.discussion_board_tag_id,
    createdTag.id,
  );

  // Step 6: Verify statistics ID exists (typia.assert already validated all types and constraints)
  TestValidator.predicate(
    "statistics record has valid ID",
    tagStatistics.id.length > 0,
  );
}
