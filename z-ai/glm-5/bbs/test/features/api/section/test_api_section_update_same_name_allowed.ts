import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that updating a section with the same name succeeds.
 *
 * This tests the business rule that name uniqueness validation excludes
 * the current section being edited, allowing updates to other fields
 * while keeping the same name.
 */
export async function test_api_section_update_same_name_allowed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_user_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a section with initial name 'Politics'
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const section = await generate_random_discussion_board_user_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: initialDescription,
      },
    },
  );
  typia.assert(section);
  // Store original timestamps for comparison
  const originalCreatedAt = section.created_at;
  const originalUpdatedAt = section.updated_at;
  // 3. Update the section with same name but new description
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedSection =
    await api.functional.discussionBoard.user.sections.update(adminConnection, {
      sectionId: section.id,
      body: {
        name: "Politics", // Same name - should be allowed
        description: newDescription,
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedSection);
  // 4. Verify the update succeeded with expected changes
  TestValidator.equals("section id unchanged", updatedSection.id, section.id);
  TestValidator.equals("name unchanged", updatedSection.name, "Politics");
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    newDescription,
  );
  TestValidator.equals(
    "creator unchanged",
    updatedSection.creator.id,
    section.creator.id,
  );
  TestValidator.predicate(
    "modifier is set after update",
    updatedSection.modifier !== null,
  );
  TestValidator.equals(
    "modifier is the admin who made the update",
    updatedSection.modifier!.id,
    admin.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedSection.updated_at,
    originalUpdatedAt,
  );
}
