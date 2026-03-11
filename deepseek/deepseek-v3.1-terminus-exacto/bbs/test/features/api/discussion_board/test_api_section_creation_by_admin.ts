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
 * Test the successful creation of a new discussion board section by an authenticated administrator.
 * Validate that sections are created with proper UUID identifiers, system-generated timestamps,
 * and correct name/description values.
 */
export async function test_api_section_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Create section with minimal required fields (name only)
  const sectionName1 = RandomGenerator.paragraph({ sentences: 2 });
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: sectionName1,
        description: null,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // Validate section 1 properties - focus on business logic
  TestValidator.equals(
    "section1 name should match input",
    section1.name,
    sectionName1,
  );
  TestValidator.equals(
    "section1 description should be null",
    section1.description,
    null,
  );
  TestValidator.equals(
    "section1 deleted_at should be null for active section",
    section1.deleted_at,
    null,
  );
  // Test 2: Create section with complete information (name and description)
  const sectionName2 = RandomGenerator.paragraph({ sentences: 2 });
  const sectionDescription = RandomGenerator.paragraph({ sentences: 3 });
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: sectionName2,
        description: sectionDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Validate section 2 properties - focus on business logic
  TestValidator.equals(
    "section2 name should match input",
    section2.name,
    sectionName2,
  );
  TestValidator.equals(
    "section2 description should match input",
    section2.description,
    sectionDescription,
  );
  TestValidator.equals(
    "section2 deleted_at should be null for active section",
    section2.deleted_at,
    null,
  );
  // Verify sections have different IDs and are properly created
  TestValidator.notEquals(
    "section1 and section2 should have different IDs",
    section1.id,
    section2.id,
  );
  TestValidator.predicate(
    "section1 should have creation timestamp",
    section1.created_at !== undefined,
  );
  TestValidator.predicate(
    "section2 should have creation timestamp",
    section2.created_at !== undefined,
  );
}
