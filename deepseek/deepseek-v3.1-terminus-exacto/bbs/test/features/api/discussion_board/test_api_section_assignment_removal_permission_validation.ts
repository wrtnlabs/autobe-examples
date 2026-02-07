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
 * Test permission validation when attempting to remove administrator assignments.
 * This scenario validates that regular administrators can only remove assignments from sections they manage,
 * while super administrators can remove any assignment regardless of section ownership.
 */
export async function test_api_section_assignment_removal_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    },
  });
  // Create first regular administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create second regular administrator
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create first section using super admin
  const section1 = await generate_random_discussion_board_admin_sections_create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(section1);
  // Create second section using super admin
  const section2 = await generate_random_discussion_board_admin_sections_create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(section2);
  // Assign admin1 to section1
  const assignment1 =
    await generate_random_discussion_board_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section1.id },
        body: {
          permission_level: "manager",
          discussion_board_admin_id: admin1.id,
        },
      },
    );
  typia.assert(assignment1);
  // Assign admin2 to section2
  const assignment2 =
    await generate_random_discussion_board_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section2.id },
        body: {
          permission_level: "manager",
          discussion_board_admin_id: admin2.id,
        },
      },
    );
  typia.assert(assignment2);
  // Test 1: Admin1 tries to remove assignment from section1 (should succeed)
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    admin1Connection,
    {
      sectionId: section1.id,
      assignmentId: assignment1.id,
    },
  );
  // Recreate assignment1 for further testing
  const assignment1Recreated =
    await generate_random_discussion_board_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section1.id },
        body: {
          permission_level: "manager",
          discussion_board_admin_id: admin1.id,
        },
      },
    );
  typia.assert(assignment1Recreated);
  // Test 2: Admin1 tries to remove assignment from section2 (should fail)
  await TestValidator.error(
    "admin1 cannot remove assignment from section2",
    async () => {
      await api.functional.discussionBoard.admin.sections.assignments.erase(
        admin1Connection,
        {
          sectionId: section2.id,
          assignmentId: assignment2.id,
        },
      );
    },
  );
  // Test 3: Super admin removes assignment from section2 (should succeed)
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    superAdminConnection,
    {
      sectionId: section2.id,
      assignmentId: assignment2.id,
    },
  );
  // Recreate assignment2 for final validation
  const assignment2Recreated =
    await generate_random_discussion_board_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: { sectionId: section2.id },
        body: {
          permission_level: "manager",
          discussion_board_admin_id: admin2.id,
        },
      },
    );
  typia.assert(assignment2Recreated);
  // Test 4: Admin2 tries to remove assignment from section2 (should succeed)
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    admin2Connection,
    {
      sectionId: section2.id,
      assignmentId: assignment2Recreated.id,
    },
  );
  // Test 5: Admin2 tries to remove assignment from section1 (should fail)
  await TestValidator.error(
    "admin2 cannot remove assignment from section1",
    async () => {
      await api.functional.discussionBoard.admin.sections.assignments.erase(
        admin2Connection,
        {
          sectionId: section1.id,
          assignmentId: assignment1Recreated.id,
        },
      );
    },
  );
  // Final cleanup by super admin
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    superAdminConnection,
    {
      sectionId: section1.id,
      assignmentId: assignment1Recreated.id,
    },
  );
}
