import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test section creation with multiple topic areas.
 *
 * This test validates the business workflow where administrators create multiple
 * topic categories for community structure and content discovery. The test verifies:
 * 1. Administrator registration and authentication
 * 2. Multiple section creation with distinct topic area names
 * 3. Each section returns complete entity with unique UUID, timestamps, and articles_count of 0
 * 4. All sections have different names and are properly stored
 * 5. Sections become immediately available for article categorization upon creation
 */
export async function test_api_section_creation_multiple_topic_areas(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Define topic areas for sections
  const sectionTopics = [
    { name: "Politics", description: "Political discussions and news" },
    { name: "Economy", description: "Economic trends and financial news" },
    {
      name: "Current Affairs",
      description: "Latest current events and affairs",
    },
  ] as const;
  // 3. Create multiple sections
  const createdSections: IDiscussionBoardSection[] = [];
  for (const topic of sectionTopics) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: topic.name,
            description: topic.description,
          },
        },
      );
    typia.assert(section);
    createdSections.push(section);
  }
  // 4. Validate business logic: sections match input topic names
  for (let i = 0; i < sectionTopics.length; i++) {
    TestValidator.equals(
      `section ${i + 1} name matches input`,
      createdSections[i].name,
      sectionTopics[i].name,
    );
    TestValidator.equals(
      `section ${i + 1} description matches input`,
      createdSections[i].description,
      sectionTopics[i].description,
    );
    TestValidator.equals(
      `section ${i + 1} articles_count is 0`,
      createdSections[i].articles_count,
      0,
    );
  }
  // 5. Verify all sections have unique names
  const sectionNames = createdSections.map((s) => s.name);
  const uniqueNames = new Set(sectionNames);
  TestValidator.equals(
    "all section names are unique",
    uniqueNames.size,
    sectionNames.length,
  );
  // 6. Verify sections are immediately available (have valid IDs for future use)
  for (const section of createdSections) {
    TestValidator.predicate(
      "section ID is available for article categorization",
      section.id !== null && section.id !== undefined,
    );
  }
}
