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
 * Test the successful deletion of an empty section by an administrator.
 *
 * This test validates that:
 * 1. An administrator can successfully delete an empty section
 * 2. The deletion operation works correctly when no articles exist in the section
 * 3. The system properly handles the deletion request
 *
 * Workflow:
 * 1. Create an administrator account and authenticate
 * 2. Create a new section (which is empty by default)
 * 3. Delete the empty section
 * 4. Verify the deletion was successful
 */
export async function test_api_section_empty_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a new section (empty by default)
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(section);
  // 3. Delete the empty section
  // Success is validated by the erase call completing without throwing an error
  // If the section had articles, this would throw a 400 Bad Request
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: section.id,
  });
}
