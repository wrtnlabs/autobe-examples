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
 * Test retrieval of a section that has been modified, verifying that modifier
 * information is properly populated. This validates the JOIN relationship
 * to discussion_board_users table on modifier_id is working correctly.
 *
 * Test Flow:
 * 1. Create a user and authenticate
 * 2. Create a section (user becomes the creator)
 * 3. Update the section (user becomes the modifier)
 * 4. Retrieve the section by ID
 * 5. Validate modifier information is populated correctly
 */
export async function test_api_section_with_modifier(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user connection for testing
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  // 2. Create a section using the utility function
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // Record the original creator information
  const originalCreator = section.creator;
  const originalCreatedAt = section.created_at;
  // 3. Update the section to populate modifier information
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.user.sections.update(userConnection, {
      sectionId: section.id,
      body: updateBody,
    });
  typia.assert(updatedSection);
  // 4. Retrieve the section by ID to verify modifier is populated
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    connection,
    {
      sectionId: section.id,
    },
  );
  typia.assert(retrievedSection);
  // 5. Validate modifier is populated (not null)
  TestValidator.predicate(
    "modifier is not null",
    retrievedSection.modifier !== null,
  );
  // Safe access after null check validation
  const modifier = retrievedSection.modifier!;
  // 6. Validate modifier information matches the user who performed the update
  TestValidator.equals("modifier id matches user id", modifier.id, user.id);
  TestValidator.equals(
    "modifier displayName matches user displayName",
    modifier.displayName,
    user.displayName,
  );
  // 7. Validate updatedAt is greater than createdAt
  TestValidator.predicate(
    "updatedAt is greater than createdAt",
    new Date(retrievedSection.updated_at).getTime() >
      new Date(originalCreatedAt).getTime(),
  );
  // 8. Validate creator information remains unchanged
  TestValidator.equals(
    "creator id remains unchanged",
    retrievedSection.creator.id,
    originalCreator.id,
  );
  TestValidator.equals(
    "creator displayName remains unchanged",
    retrievedSection.creator.displayName,
    originalCreator.displayName,
  );
}
