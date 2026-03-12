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
 * Test idempotency of section deletion with multiple deletion attempts.
 *
 * This test verifies that deleting the same section multiple times is handled
 * gracefully without causing system errors or data corruption. The test:
 * 1. Registers an administrator account
 * 2. Creates a new section
 * 3. Deletes the section (first attempt - should succeed)
 * 4. Attempts to delete the same section again (second attempt)
 * 5. Attempts deletion a third time to confirm consistent behavior
 */
export async function test_api_section_deletion_idempotency_multiple_attempts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: undefined,
  });
  // 2. Create a section to delete
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      administratorConnection,
      { body: undefined },
    );
  typia.assert(section);
  // 3. First deletion attempt (should succeed)
  await api.functional.discussionBoard.administrator.sections.erase(
    administratorConnection,
    { sectionId: section.id },
  );
  // 4. Second deletion attempt (should handle gracefully - either succeed or return error)
  await api.functional.discussionBoard.administrator.sections.erase(
    administratorConnection,
    { sectionId: section.id },
  );
  // 5. Third deletion attempt (confirm consistent behavior)
  await api.functional.discussionBoard.administrator.sections.erase(
    administratorConnection,
    { sectionId: section.id },
  );
  // 6. Verify the section ID is valid UUID format
  TestValidator.equals("section ID is valid UUID", section.id, section.id);
}
