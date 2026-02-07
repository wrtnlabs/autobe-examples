import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test updating basic section information including name, description, and display order.
 * Validate that the super administrator can successfully modify section properties while
 * maintaining data integrity. Verify that the updated section is returned with correct
 * timestamps and that the name uniqueness constraint is properly enforced (excluding
 * the current section). Check that the updated_at timestamp reflects the modification time.
 */
export async function test_api_section_update_basic_information(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Store original timestamps for comparison
  const originalCreatedAt = section.created_at;
  const originalUpdatedAt = section.updated_at;
  // Update section information
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // Validate that the section was updated correctly
  TestValidator.equals(
    "section ID remains the same",
    updatedSection.id,
    section.id,
  );
  TestValidator.equals("name is updated", updatedSection.name, updateBody.name);
  TestValidator.equals(
    "description is updated",
    updatedSection.description,
    updateBody.description,
  );
  TestValidator.equals(
    "display order is updated",
    updatedSection.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than original",
    new Date(updatedSection.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.equals(
    "status remains active",
    updatedSection.status,
    "active",
  );
  TestValidator.predicate(
    "deleted_at remains null",
    updatedSection.deleted_at === null,
  );
  // Test name uniqueness constraint
  // Create another section with a unique name
  const otherSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(otherSection);
  // Try to update the original section to use the other section's name
  // This should succeed because name uniqueness excludes the current section
  const uniquenessUpdateBody = {
    name: otherSection.name,
  } satisfies IDiscussionBoardSection.IUpdate;
  const uniquenessUpdatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: uniquenessUpdateBody,
      },
    );
  typia.assert(uniquenessUpdatedSection);
  TestValidator.equals(
    "name uniqueness allows update when excluding current section",
    uniquenessUpdatedSection.name,
    otherSection.name,
  );
  // Test partial update (only updating display order, leaving name and description undefined)
  const partialUpdateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
  } satisfies IDiscussionBoardSection.IUpdate;
  const partiallyUpdatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdatedSection);
  // Validate partial update preserves undefined fields
  TestValidator.equals(
    "name remains unchanged after partial update",
    partiallyUpdatedSection.name,
    otherSection.name,
  );
  TestValidator.equals(
    "description remains unchanged after partial update",
    partiallyUpdatedSection.description,
    updateBody.description,
  );
  TestValidator.equals(
    "display order is updated in partial update",
    partiallyUpdatedSection.display_order,
    partialUpdateBody.display_order,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer after partial update",
    new Date(partiallyUpdatedSection.updated_at) >
      new Date(uniquenessUpdatedSection.updated_at),
  );
}
