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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_assignments_create } from "../../../generate/generate_random_discussion_board_admin_sections_assignments_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_administrator } from "../../../prepare/prepare_random_discussion_board_section_administrator";

/**
 * Test reassigning a section administrator assignment from one administrator type to another.
 * Create a section with an assignment to a regular administrator, then update the assignment
 * to reassign it to a super administrator. Validate that the administrator reference is
 * successfully changed, the assignment maintains its relationship to the section, and the
 * permission level remains intact.
 */
export async function test_api_section_assignment_admin_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Create and authenticate regular administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create and authenticate super administrator
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 3. Create a section using regular admin
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
  // 4. Create initial assignment with regular administrator
  const initialAssignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: adminAuth.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // Validate initial assignment
  TestValidator.equals(
    "initial assignment has regular admin",
    initialAssignment.admin?.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "initial assignment has no super admin",
    initialAssignment.superAdmin,
    null,
  );
  TestValidator.equals(
    "assignment references correct section",
    initialAssignment.section.id,
    section.id,
  );
  // 5. Reassign assignment to super administrator
  const updatedAssignment =
    await api.functional.discussionBoard.admin.sections.assignments.update(
      adminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: null,
          discussion_board_super_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardSectionAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 6. Validate reassignment properties
  TestValidator.equals(
    "assignment ID remains the same",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "updated assignment has no regular admin",
    updatedAssignment.admin,
    null,
  );
  TestValidator.equals(
    "updated assignment has super admin",
    updatedAssignment.superAdmin?.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "assignment maintains section reference",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "permission level remains consistent",
    updatedAssignment.permission_level,
    "moderator",
  );
  TestValidator.notEquals(
    "assignment date should be updated",
    initialAssignment.assignment_date,
    updatedAssignment.assignment_date,
  );
}
