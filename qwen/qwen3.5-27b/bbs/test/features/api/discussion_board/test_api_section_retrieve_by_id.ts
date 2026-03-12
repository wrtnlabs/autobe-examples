import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a section can be successfully retrieved by its unique identifier.
 *
 * **Setup**:
 * 1. Register and authenticate as an administrator
 * 2. Create a section with a unique name and description
 * 3. Capture the returned section ID
 *
 * **Test Execution**:
 * 1. Call GET /discussionBoard/sections/{sectionId} with the captured section ID
 * 2. Verify the response contains all expected fields: id, name, description, created_at, updated_at
 * 3. Verify the returned data matches the created section's data
 *
 * **Expected Result**:
 * - HTTP 200 OK
 * - Response body contains complete section information
 * - All timestamps are in ISO 8601 format
 */
export async function test_api_section_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a section using the utility function
  const createdSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdSection);
  // 3. Retrieve the section by ID (public endpoint, no auth required)
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    connection,
    {
      sectionId: createdSection.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Validate the retrieved section matches the created section
  TestValidator.equals(
    "section ID matches",
    retrievedSection.id,
    createdSection.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedSection.name,
    createdSection.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedSection.description,
    createdSection.description,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedSection.created_at,
    createdSection.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp matches",
    retrievedSection.updated_at,
    createdSection.updated_at,
  );
}
