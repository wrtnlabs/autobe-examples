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

export async function test_api_section_administrator_assignment_update_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create initial assignment with first permission level
  const initialPermissionLevel = "moderator";
  const assignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: initialPermissionLevel,
          discussion_board_super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Verify initial assignment
  TestValidator.equals("section matches", assignment.section.id, section.id);
  TestValidator.equals(
    "initial permission level",
    assignment.permission_level,
    initialPermissionLevel,
  );
  TestValidator.equals(
    "super admin assigned",
    assignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "assignment date set",
    assignment.assignment_date !== null,
  );
  TestValidator.predicate("created_at set", assignment.created_at !== null);
  TestValidator.equals(
    "deleted_at null for active assignment",
    assignment.deleted_at,
    null,
  );
  // Update assignment with new permission level
  const updatedPermissionLevel = "administrator";
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.sections.assignments.update(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
        body: {
          permission_level: updatedPermissionLevel,
          discussion_board_super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Verify updated assignment
  TestValidator.equals(
    "assignment id unchanged",
    updatedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "section unchanged",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "super admin unchanged",
    updatedAssignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "permission level updated",
    updatedAssignment.permission_level,
    updatedPermissionLevel,
  );
  TestValidator.equals(
    "assignment date unchanged",
    updatedAssignment.assignment_date,
    assignment.assignment_date,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedAssignment.updated_at,
    assignment.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedAssignment.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedAssignment.updated_at) > new Date(assignment.updated_at),
  );
}
