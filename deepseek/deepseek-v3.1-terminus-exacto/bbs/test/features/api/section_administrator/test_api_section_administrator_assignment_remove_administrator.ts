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

/**
 * Test updating a section administrator assignment by removing the administrator reference while keeping the assignment record active.
 * 1. Create a super admin connection and authenticate
 * 2. Create a section for assignment
 * 3. Create initial administrator assignment for the section
 * 4. Update the assignment by setting both administrator references to null
 * 5. Verify the assignment record persists with null administrator references
 */
export async function test_api_section_administrator_assignment_remove_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
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
  // 2. Create a section for assignment
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
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
  // 3. Create initial administrator assignment for the section
  const initialAssignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "moderator",
          discussion_board_super_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // 4. Update the assignment by setting both administrator references to null
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.sections.assignments.update(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: null,
          discussion_board_super_admin_id: null,
        } satisfies IDiscussionBoardSectionAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 5. Verify the assignment record persists with null administrator references
  TestValidator.equals(
    "assignment id remains the same",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "section reference remains the same",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "permission level remains",
    updatedAssignment.permission_level,
    "moderator",
  );
  TestValidator.equals(
    "admin reference is null",
    updatedAssignment.admin,
    null,
  );
  TestValidator.equals(
    "super admin reference is null",
    updatedAssignment.superAdmin,
    null,
  );
  TestValidator.equals(
    "assignment date is preserved",
    updatedAssignment.assignment_date,
    initialAssignment.assignment_date,
  );
  TestValidator.equals(
    "created at is preserved",
    updatedAssignment.created_at,
    initialAssignment.created_at,
  );
  TestValidator.notEquals(
    "updated at timestamp changed",
    updatedAssignment.updated_at,
    initialAssignment.updated_at,
  );
}
