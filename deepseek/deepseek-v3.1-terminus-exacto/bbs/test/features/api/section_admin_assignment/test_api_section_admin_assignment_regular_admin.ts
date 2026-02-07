import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_assignments_create } from "../../../generate/generate_random_discussion_board_admin_sections_assignments_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_administrator } from "../../../prepare/prepare_random_discussion_board_section_administrator";

/**
 * Test the assignment of a regular administrator to a section with appropriate permission levels.
 * 1. Create an admin account using the join endpoint
 * 2. Create a section for management
 * 3. Assign the regular administrator to the section
 * 4. Validate assignment creation and relationships
 */
export async function test_api_section_admin_assignment_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section for assignment
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Assign the regular administrator to the section
  const assignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "section_manager",
          discussion_board_admin_id: admin.id,
          discussion_board_super_admin_id: null,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Validate business logic relationships
  TestValidator.equals(
    "admin reference matches",
    assignment.admin?.id,
    admin.id,
  );
  TestValidator.equals(
    "section reference matches",
    assignment.section.id,
    section.id,
  );
  TestValidator.predicate(
    "super admin is null",
    assignment.superAdmin === null,
  );
  TestValidator.equals(
    "permission level matches",
    assignment.permission_level,
    "section_manager",
  );
}
