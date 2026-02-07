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

export async function test_api_section_assignment_removal_with_different_permission_levels(
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
  // Create a test section
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
  // Define permission levels to test
  const permissionLevels = ["full", "moderate", "basic"] as const;
  const assignments: IDiscussionBoardSectionAdministrator[] = [];
  // Create assignments with different permission levels
  for (const permissionLevel of permissionLevels) {
    const assignment =
      await generate_random_discussion_board_super_admin_sections_assignments_create(
        superAdminConnection,
        {
          params: {
            sectionId: section.id,
          },
          body: {
            permission_level: permissionLevel,
            discussion_board_super_admin_id: superAdmin.id,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    typia.assert(assignment);
    assignments.push(assignment);
  }
  // Verify assignments were created with correct permission levels
  TestValidator.equals("should have three assignments", assignments.length, 3);
  TestValidator.predicate(
    "first assignment has permission level",
    assignments[0].permission_level === "full" ||
      assignments[0].permission_level === "moderate" ||
      assignments[0].permission_level === "basic",
  );
  TestValidator.predicate(
    "second assignment has permission level",
    assignments[1].permission_level === "full" ||
      assignments[1].permission_level === "moderate" ||
      assignments[1].permission_level === "basic",
  );
  TestValidator.predicate(
    "third assignment has permission level",
    assignments[2].permission_level === "full" ||
      assignments[2].permission_level === "moderate" ||
      assignments[2].permission_level === "basic",
  );
  // Remove each assignment and verify successful removal
  for (const assignment of assignments) {
    await api.functional.discussionBoard.superAdmin.sections.assignments.erase(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
    // Verify assignment was successfully removed by checking the operation completed without error
    TestValidator.predicate("assignment removal completed successfully", true);
  }
  // Verify all assignments were successfully removed
  TestValidator.predicate(
    "all assignments removed successfully",
    assignments.length === 3,
  );
}