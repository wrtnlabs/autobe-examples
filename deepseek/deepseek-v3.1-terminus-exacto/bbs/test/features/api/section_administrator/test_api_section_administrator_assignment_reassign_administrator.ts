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

export async function test_api_section_administrator_assignment_reassign_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
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
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create initial assignment with regular administrator
  const initialAssignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: null,
          discussion_board_super_admin_id: null,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // Update assignment to reassign to super administrator
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.sections.assignments.update(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: null,
          discussion_board_super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Validate the assignment was correctly updated
  TestValidator.equals(
    "assignment ID remains the same",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "section reference remains the same",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "permission level remains consistent",
    updatedAssignment.permission_level,
    "moderator",
  );
  TestValidator.equals(
    "regular admin reference cleared",
    updatedAssignment.admin,
    null,
  );
  TestValidator.equals(
    "super admin reference set",
    updatedAssignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "assignment date should be set",
    updatedAssignment.assignment_date !== undefined,
  );
}
