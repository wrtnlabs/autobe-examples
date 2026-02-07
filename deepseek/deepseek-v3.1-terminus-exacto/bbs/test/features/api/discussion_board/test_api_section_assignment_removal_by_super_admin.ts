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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_assignments_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_administrator } from "../../../prepare/prepare_random_discussion_board_section_administrator";

export async function test_api_section_assignment_removal_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a new section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create an assignment for the section (assigning the super admin to the section)
  const assignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full_access",
          discussion_board_super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Verify assignment was created successfully
  TestValidator.equals(
    "assignment section matches",
    assignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "assignment super admin matches",
    assignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "assignment has permission level",
    assignment.permission_level === "full_access",
  );
  // Remove the assignment
  await api.functional.discussionBoard.superAdmin.sections.assignments.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      assignmentId: assignment.id,
    },
  );
  // Verify assignment removal was successful (no error thrown)
  TestValidator.predicate("assignment removal succeeded", true);
  // Additional validation: Try to create another assignment with same parameters should work
  const newAssignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "read_only",
          discussion_board_super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(newAssignment);
  TestValidator.equals(
    "new assignment section matches",
    newAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "new assignment super admin matches",
    newAssignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "new assignment has different permission level",
    newAssignment.permission_level === "read_only",
  );
}
