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
 * Test the primary success path for updating a discussion board section's name and description.
 * An administrator should be able to modify both the section name and description simultaneously.
 * The test verifies that the updated section returns all fields correctly with the new name
 * and description, while preserving the original creator, created_at timestamp, and updating
 * the updated_at timestamp. The section should remain active (deleted_at null) after the update.
 */
export async function test_api_section_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a section
  const originalSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  // Store original values for validation
  const originalName = originalSection.name;
  const originalDescription = originalSection.description;
  const originalCreatorId = originalSection.creator.id;
  const originalCreatedAt = originalSection.created_at;
  // 3. Prepare update data with new name and description
  const newName = RandomGenerator.name(3);
  const newDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 5,
    wordMax: 10,
  });
  const updateBody = {
    name: newName,
    description: newDescription,
  } satisfies IDiscussionBoardSection.IUpdate;
  // 4. Update the section
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Validate the update results
  // Name and description should be updated
  TestValidator.equals("section name updated", updatedSection.name, newName);
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    newDescription,
  );
  // Creator should remain unchanged
  TestValidator.equals(
    "creator unchanged",
    updatedSection.creator.id,
    originalCreatorId,
  );
  // created_at should remain unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  // updated_at should be newer than created_at
  const createdAt = new Date(updatedSection.created_at);
  const updatedAt = new Date(updatedSection.updated_at);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt.getTime() > createdAt.getTime(),
  );
  // Section should remain active (deleted_at null)
  TestValidator.equals(
    "section remains active",
    updatedSection.deleted_at,
    null,
  );
  // Verify IDs match
  TestValidator.equals(
    "section ID preserved",
    updatedSection.id,
    originalSection.id,
  );
}
