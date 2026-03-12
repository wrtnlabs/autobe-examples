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
 * Test that attempting to retrieve a soft-deleted section returns 404 Not Found.
 *
 * This test verifies the soft delete mechanism properly hides sections from
 * public view. After soft-deleting a section, the retrieve endpoint should
 * treat it as non-existent and return a 404 error.
 */
export async function test_api_section_soft_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Soft-delete the section
  await api.functional.discussionBoard.administrator.sections.erase(
    adminConnection,
    {
      sectionId: section.id,
    },
  );
  // 4. Verify that retrieving the soft-deleted section returns 404
  await TestValidator.error("soft-deleted section returns 404", async () => {
    await api.functional.discussionBoard.sections.at(adminConnection, {
      sectionId: section.id,
    });
  });
}
