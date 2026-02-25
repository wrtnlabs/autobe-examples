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
 * Test section update modifier tracking for audit trail purposes.
 *
 * Steps:
 * 1. First administrator registers and creates a section (becomes creator)
 * 2. Second administrator registers (different account)
 * 3. Second administrator updates the section
 * 4. Verify modifier tracking: modifier shows second admin, creator unchanged
 */
export async function test_api_section_update_modifier_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First administrator registers and creates section
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_user_join(firstAdminConnection, {});
  typia.assert(firstAdmin);
  const section = await generate_random_discussion_board_user_sections_create(
    firstAdminConnection,
    {},
  );
  typia.assert(section);
  // Store original section data for comparison
  const originalCreator = section.creator;
  const originalCreatedAt = section.created_at;
  // Step 2: Second administrator registers
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_user_join(secondAdminConnection, {});
  typia.assert(secondAdmin);
  // Step 3: Second administrator updates the section
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.user.sections.update(
      secondAdminConnection,
      {
        sectionId: section.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // Step 4: Verify modifier tracking
  // Modifier should be the second administrator
  TestValidator.predicate(
    "modifier is set after update",
    updatedSection.modifier !== null,
  );
  // Use assert with assignment to get a narrowed type
  const modifier = typia.assert(updatedSection.modifier!);
  TestValidator.equals(
    "modifier id matches second administrator",
    modifier.id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "modifier displayName matches second administrator",
    modifier.displayName,
    secondAdmin.displayName,
  );
  TestValidator.equals(
    "modifier email matches second administrator",
    modifier.email,
    secondAdmin.email,
  );
  // Creator should remain unchanged (first administrator)
  TestValidator.equals(
    "creator id unchanged",
    updatedSection.creator.id,
    originalCreator.id,
  );
  TestValidator.equals(
    "creator displayName unchanged",
    updatedSection.creator.displayName,
    originalCreator.displayName,
  );
  TestValidator.equals(
    "creator email unchanged",
    updatedSection.creator.email,
    originalCreator.email,
  );
  // Timestamp validation
  TestValidator.equals(
    "created_at unchanged",
    updatedSection.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedSection.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
