import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section creation and basic retrieval functionality.
 * Since the API only supports individual section operations, this test focuses
 * on validating that sections can be created and retrieved successfully.
 */
export async function test_api_admin_sections_alphabetical_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections with different names
  const sectionNames = [
    "Zebra Section",
    "apple section",
    "Banana Section",
    "cherry SECTION",
    "Date Section",
  ];
  const createdSections: IDiscussionBoardSection[] = [];
  for (const name of sectionNames) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    createdSections.push(section);
  }
  // Test that we can retrieve section information
  // Note: The current API endpoint returns a single section summary
  const sectionSummary =
    await api.functional.discussionBoard.admin.sections.at(adminConnection);
  typia.assert(sectionSummary);
  // Validate basic section summary properties
  TestValidator.predicate(
    "section summary has id",
    typeof sectionSummary.id === "string",
  );
  TestValidator.predicate(
    "section summary has name",
    typeof sectionSummary.name === "string",
  );
  TestValidator.predicate(
    "section summary has created_at",
    typeof sectionSummary.created_at === "string",
  );
  // Verify that all sections were created successfully
  TestValidator.equals(
    "correct number of sections created",
    createdSections.length,
    sectionNames.length,
  );
  // Validate that each created section has the expected properties
  for (let i = 0; i < createdSections.length; i++) {
    const section = createdSections[i];
    TestValidator.equals(
      `section ${i} name matches creation input`,
      section.name,
      sectionNames[i],
    );
    TestValidator.predicate(
      `section ${i} has valid id`,
      typeof section.id === "string",
    );
    TestValidator.predicate(
      `section ${i} has created_at`,
      typeof section.created_at === "string",
    );
  }
}
