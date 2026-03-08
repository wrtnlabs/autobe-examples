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
 * Test successful section update by an administrator.
 *
 * Flow:
 * 1. Administrator authenticates via /auth/admin/join
 * 2. Administrator creates a section via POST /admin/sections
 * 3. Administrator updates the section with new name and description
 * 4. Validate that all updates are applied correctly
 */
export async function test_api_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a section to update
  const originalSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(originalSection);
  // 3. Update the section with new values
  const updateData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: originalSection.id,
        body: updateData,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate the update
  // ID should remain unchanged
  TestValidator.equals("id unchanged", updatedSection.id, originalSection.id);
  // Name should be updated
  TestValidator.equals("name updated", updatedSection.name, updateData.name!);
  // Description should be updated
  TestValidator.equals(
    "description updated",
    updatedSection.description,
    updateData.description!,
  );
  // Sequence should remain unchanged
  TestValidator.equals(
    "sequence unchanged",
    updatedSection.sequence,
    originalSection.sequence,
  );
  // Creator should remain unchanged
  TestValidator.equals(
    "creator unchanged",
    updatedSection.creator.id,
    originalSection.creator.id,
  );
  // CreatedAt should remain unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedSection.createdAt,
    originalSection.createdAt,
  );
  // UpdatedAt should be different (updated to current time)
  TestValidator.notEquals(
    "updatedAt changed",
    updatedSection.updatedAt,
    originalSection.updatedAt,
  );
}
