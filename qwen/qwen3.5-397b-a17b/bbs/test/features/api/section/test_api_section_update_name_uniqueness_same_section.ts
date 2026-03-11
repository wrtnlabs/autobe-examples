import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test section name uniqueness validation when updating a section.
 *
 * An administrator creates a section with a specific name, then attempts to update
 * that same section using its own existing name. This should succeed because the
 * uniqueness constraint excludes the current section being updated. Verify the
 * update completes successfully, demonstrating that the system correctly handles
 * the edge case where a section keeps its own name during an update operation.
 * This validates the business rule that name uniqueness is checked against other
 * sections only, not the section being modified.
 */
export async function test_api_section_update_name_uniqueness_same_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial section with specific name
  const originalName = RandomGenerator.paragraph({ sentences: 1 });
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Update the same section with its own existing name (should succeed)
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          name: originalName, // Using the same name - should succeed
          description: RandomGenerator.paragraph({ sentences: 3 }), // Change description to verify update occurred
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 4. Validate the update succeeded
  TestValidator.equals("section ID unchanged", section.id, updatedSection.id);
  TestValidator.equals(
    "name unchanged (same name used)",
    originalName,
    updatedSection.name,
  );
  TestValidator.notEquals(
    "description changed",
    section.description,
    updatedSection.description,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    section.updated_at,
    updatedSection.updated_at,
  );
}
