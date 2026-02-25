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
 * Test attempting to update a non-existent administrator assignment.
 * Validates proper error handling when trying to update an assignment ID
 * that doesn't exist in the system.
 *
 * Steps:
 * 1. Authenticate as super administrator
 * 2. Create a section for testing
 * 3. Attempt to update assignment with random UUID (non-existent)
 * 4. Validate appropriate error response
 */
export async function test_api_section_administrator_non_existent_assignment_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create a section for testing
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(section);
  // 3. Attempt to update non-existent assignment with valid section ID
  const nonExistentAssignmentId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    permission_level: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardSuperAdmin.IUpdate;
  // 4. Validate error response for non-existent assignment
  await TestValidator.error(
    "should reject non-existent assignment ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.administrators.update(
        superAdminConnection,
        {
          sectionId: section.id,
          assignmentId: nonExistentAssignmentId,
          body: updateBody,
        },
      );
    },
  );
}
