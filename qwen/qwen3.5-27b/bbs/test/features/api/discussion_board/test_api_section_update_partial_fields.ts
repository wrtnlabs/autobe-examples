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
 * Test that an administrator can perform a partial update by modifying only the description while keeping the name unchanged.
 *
 * Setup:
 * 1. Register and authenticate as an administrator
 * 2. Create a section with initial name and description
 *
 * Test Steps:
 * 1. Store the original section name and description
 * 2. Call PUT /discussionBoard/administrator/sections/{sectionId} with only the description field in request body (omit name)
 * 3. Verify the response returns the section entity
 * 4. Verify the description is updated to the new value
 * 5. Verify the name remains unchanged from the original
 * 6. Verify updated_at timestamp is different from created_at
 * 7. Verify created_at remains unchanged
 */
export async function test_api_section_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create initial section
  const originalSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(originalSection);
  // Store original values for comparison
  const originalName = originalSection.name;
  const originalDescription = originalSection.description;
  const originalCreatedAt = originalSection.created_at;
  // 3. Prepare partial update with only description (omit name)
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    description: newDescription,
  } satisfies IDiscussionBoardSection.IUpdate;
  // 4. Perform partial update
  const updatedSection =
    await api.functional.discussionBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Validate partial update results
  // Description should be updated to new value
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    newDescription,
  );
  // Name should remain unchanged
  TestValidator.equals("name unchanged", updatedSection.name, originalName);
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  // updated_at should be different from created_at (indicating update occurred)
  TestValidator.notEquals(
    "updated_at changed",
    updatedSection.updated_at,
    originalSection.created_at,
  );
  // updated_at should be different from original updated_at
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedSection.updated_at,
    originalSection.updated_at,
  );
}
