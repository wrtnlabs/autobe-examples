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
 * Test that section creation is rejected when attempting to create a section with a name that already exists.
 *
 * This test verifies the duplicate name constraint enforcement for discussion board sections.
 * It creates a section with a unique name, then attempts to create another section with the same name,
 * expecting the second creation to be rejected with an appropriate error.
 */
export async function test_api_section_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create the first section with a specific name
  const sectionName = "Politics";
  const firstDescription = "Political discussions";
  const firstSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: firstDescription,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // 3. Verify the first section was created successfully
  TestValidator.equals(
    "first section name matches",
    firstSection.name,
    sectionName,
  );
  TestValidator.equals(
    "first section description matches",
    firstSection.description,
    firstDescription,
  );
  TestValidator.predicate(
    "first section has valid ID",
    firstSection.id.length > 0,
  );
  // 4. Attempt to create a second section with the same name (should fail)
  const secondDescription = "Different political discussions";
  await TestValidator.error("duplicate section name rejected", async () => {
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: secondDescription,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
  // 5. Verify the original section remains unchanged
  TestValidator.equals(
    "original section name unchanged",
    firstSection.name,
    sectionName,
  );
  TestValidator.equals(
    "original section description unchanged",
    firstSection.description,
    firstDescription,
  );
}
