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
 * Test the retrieval of an assignment where a super administrator is assigned to manage a section.
 * This scenario validates the endpoint correctly handles assignments referencing super administrators
 * instead of regular administrators. The test creates a section, assigns a super administrator to it,
 * then retrieves the assignment details to verify the superAdmin reference is properly populated
 * while the admin reference remains null, demonstrating the system's support for both administrator
 * types in section assignments.
 */
export async function test_api_admin_section_assignment_retrieval_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate regular administrator (for reference, not used in assignment)
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
  // 3. Create a section for assignment testing
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
  // 4. Assign the super administrator to the section
  const assignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full_access",
          discussion_board_super_admin_id: superAdmin.id,
          discussion_board_admin_id: null,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // 5. Retrieve the assignment details
  const retrievedAssignment =
    await api.functional.discussionBoard.admin.sections.assignments.at(
      adminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // 6. Validate the assignment details
  TestValidator.equals(
    "assignment id matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "permission level matches",
    retrievedAssignment.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "section id matches",
    retrievedAssignment.section.id,
    section.id,
  );
  // Validate super administrator reference is populated
  TestValidator.predicate(
    "superAdmin reference exists",
    retrievedAssignment.superAdmin !== null,
  );
  TestValidator.equals(
    "superAdmin id matches",
    retrievedAssignment.superAdmin!.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "superAdmin email matches",
    retrievedAssignment.superAdmin!.email,
    superAdmin.email,
  );
  TestValidator.equals(
    "superAdmin privilege level matches",
    retrievedAssignment.superAdmin!.privilege_level,
    superAdmin.privilege_level,
  );
  // Validate regular administrator reference is null (since we assigned super admin)
  TestValidator.equals(
    "admin reference is null",
    retrievedAssignment.admin,
    null,
  );
}
