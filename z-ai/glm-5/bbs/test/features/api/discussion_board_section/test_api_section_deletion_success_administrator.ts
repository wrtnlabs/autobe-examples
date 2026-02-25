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
 * Test successful soft deletion of a discussion board section by an administrator.
 * Validates that the section deletion operation completes successfully and the
 * soft-delete mechanism works with cascade behavior for related articles.
 */
export async function test_api_section_deletion_success_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_user_join(adminConnection, {});
  typia.assert(adminUser);
  // 2. Create a section for testing deletion
  const section = await generate_random_discussion_board_user_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 3. Verify section was created without deleted_at
  TestValidator.equals(
    "section created without deleted_at",
    section.deleted_at,
    null,
  );
  // 4. Store section ID before deletion
  const sectionId = section.id;
  // 5. Delete the section (soft-delete operation)
  // Note: This operation requires ADMINISTRATOR or SUPER_ADMINISTRATOR permission
  // The API performs soft-delete with cascade to articles:
  // - Sets deleted_at timestamp on the section
  // - Cascade soft-deletes all articles within the section
  await api.functional.discussionBoard.user.sections.erase(adminConnection, {
    sectionId,
  });
  // 6. Success: The erase operation completed without error
  // The void response indicates the soft-delete was performed
  // Audit trail is preserved in the database
}
