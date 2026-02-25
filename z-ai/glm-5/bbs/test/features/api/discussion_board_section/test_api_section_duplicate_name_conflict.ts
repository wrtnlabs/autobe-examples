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
 * Test that creating a section with a duplicate name returns a conflict error.
 *
 * Validates that:
 * 1. First section creation succeeds with valid response
 * 2. Second section creation with same name fails
 * 3. System enforces unique name constraint for active sections
 */
export async function test_api_section_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(authResult);
  // Step 2: Create first section successfully
  const sectionName = "Economy";
  const firstDescription = RandomGenerator.paragraph({ sentences: 5 });
  const firstSection =
    await api.functional.discussionBoard.user.sections.create(userConnection, {
      body: {
        name: sectionName,
        description: firstDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    });
  typia.assert(firstSection);
  // Validate first section was created correctly
  TestValidator.equals("first section name", firstSection.name, sectionName);
  TestValidator.equals(
    "first section description",
    firstSection.description,
    firstDescription,
  );
  TestValidator.predicate(
    "first section has valid id",
    firstSection.id.length > 0,
  );
  TestValidator.equals(
    "first section is active",
    firstSection.deleted_at,
    null,
  );
  // Step 3: Attempt to create second section with duplicate name
  const secondDescription = RandomGenerator.paragraph({ sentences: 5 });
  await TestValidator.error("duplicate section name", async () => {
    await api.functional.discussionBoard.user.sections.create(userConnection, {
      body: {
        name: sectionName,
        description: secondDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    });
  });
}
