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
 * Test that an authenticated administrator can successfully update an existing section's name and description.
 *
 * Setup:
 * 1. Register and authenticate as an administrator
 * 2. Create a section with initial name and description
 *
 * Test Steps:
 * 1. Call PUT /discussionBoard/administrator/sections/{sectionId} with updated name and description
 * 2. Verify the response returns the updated section entity
 * 3. Verify the response includes the new name, new description, and updated updated_at timestamp
 * 4. Verify the id and created_at remain unchanged
 */
export async function test_api_section_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create new connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create initial section
  const initialSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(initialSection);
  // Store initial values for comparison
  const initialId = initialSection.id;
  const initialCreatedAt = initialSection.created_at;
  const initialUpdatedAt = initialSection.updated_at;
  // 3. Prepare update request with new name and description
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSection.IUpdate;
  // 4. Update the section
  const updatedSection =
    await api.functional.discussionBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Validate response
  TestValidator.equals("section id unchanged", updatedSection.id, initialId);
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    initialCreatedAt,
  );
  TestValidator.equals("name updated", updatedSection.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "updated_at is newer",
    updatedSection.updated_at > initialUpdatedAt,
  );
}
