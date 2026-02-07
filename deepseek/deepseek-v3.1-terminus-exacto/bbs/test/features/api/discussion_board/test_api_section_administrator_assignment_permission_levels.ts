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
import { generate_random_discussion_board_super_admin_sections_assignments_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_assignments_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_administrator } from "../../../prepare/prepare_random_discussion_board_section_administrator";

/**
 * Test the assignment of administrators with different permission levels to sections.
 * This scenario validates that various permission levels can be assigned correctly
 * and that administrators receive appropriate capabilities based on their assigned
 * permission level.
 */
export async function test_api_section_administrator_assignment_permission_levels(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create and authenticate super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create multiple sections for testing
  const sections = await ArrayUtil.asyncRepeat(3, async (index) => {
    const section =
      await api.functional.discussionBoard.superAdmin.sections.create(
        superAdminConnection,
        {
          body: {
            name: `Test Section ${index + 1}`,
            description: `Description for test section ${index + 1}`,
            display_order: index + 1,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    // Validate section creation
    TestValidator.equals(
      `section ${index + 1} should have active status`,
      section.status,
      "active",
    );
    TestValidator.equals(
      `section ${index + 1} should have correct display order`,
      section.display_order,
      index + 1,
    );
    TestValidator.predicate(
      `section ${index + 1} should have valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    return section;
  });
  // Create regular administrator accounts using utility function
  const regularAdmins = await ArrayUtil.asyncRepeat(2, async (index) => {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
        display_name: `Regular Admin ${index + 1}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(admin);
    // Validate admin creation
    TestValidator.equals(
      `admin ${index + 1} should have correct display name`,
      admin.display_name,
      `Regular Admin ${index + 1}`,
    );
    TestValidator.predicate(
      `admin ${index + 1} should have valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        admin.id,
      ),
    );
    return admin;
  });
  // Create additional super administrator accounts using utility function
  const additionalSuperAdmins = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const superAdminConn: api.IConnection = { host: connection.host };
      const superAdmin = await authorize_super_admin_join(superAdminConn, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "superadmin123",
          privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      });
      typia.assert(superAdmin);
      // Validate super admin creation
      TestValidator.equals(
        `super admin ${index + 1} should have correct privilege level`,
        superAdmin.privilege_level,
        "super_admin",
      );
      TestValidator.predicate(
        `super admin ${index + 1} should have valid UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          superAdmin.id,
        ),
      );
      return superAdmin;
    },
  );
  // Test different permission levels - using realistic permission levels
  const permissionLevels = ["view", "edit", "manage", "admin"] as const;
  // Assign regular administrators with different permission levels
  const regularAdminAssignments = await ArrayUtil.asyncRepeat(
    regularAdmins.length,
    async (index) => {
      const assignment =
        await api.functional.discussionBoard.superAdmin.sections.assignments.create(
          superAdminConnection,
          {
            sectionId: sections[index].id,
            body: {
              permission_level:
                permissionLevels[index % permissionLevels.length],
              discussion_board_admin_id: regularAdmins[index].id,
              discussion_board_super_admin_id: null,
            } satisfies IDiscussionBoardSectionAdministrator.ICreate,
          },
        );
      typia.assert(assignment);
      return assignment;
    },
  );
  // Assign super administrators with different permission levels
  const superAdminAssignments = await ArrayUtil.asyncRepeat(
    additionalSuperAdmins.length,
    async (index) => {
      const assignment =
        await api.functional.discussionBoard.superAdmin.sections.assignments.create(
          superAdminConnection,
          {
            sectionId:
              sections[(index + regularAdmins.length) % sections.length].id,
            body: {
              permission_level:
                permissionLevels[(index + 1) % permissionLevels.length],
              discussion_board_admin_id: null,
              discussion_board_super_admin_id: additionalSuperAdmins[index].id,
            } satisfies IDiscussionBoardSectionAdministrator.ICreate,
          },
        );
      typia.assert(assignment);
      return assignment;
    },
  );
  // Validate assignments
  regularAdminAssignments.forEach((assignment, index) => {
    TestValidator.equals(
      "regular admin assignment should reference correct admin",
      assignment.admin?.id,
      regularAdmins[index].id,
    );
    TestValidator.equals(
      "regular admin assignment should have null super admin",
      assignment.superAdmin,
      null,
    );
    TestValidator.equals(
      "regular admin assignment should have correct permission level",
      assignment.permission_level,
      permissionLevels[index % permissionLevels.length],
    );
    TestValidator.equals(
      "regular admin assignment should reference correct section",
      assignment.section.id,
      sections[index].id,
    );
  });
  superAdminAssignments.forEach((assignment, index) => {
    TestValidator.equals(
      "super admin assignment should reference correct super admin",
      assignment.superAdmin?.id,
      additionalSuperAdmins[index].id,
    );
    TestValidator.equals(
      "super admin assignment should have null regular admin",
      assignment.admin,
      null,
    );
    TestValidator.equals(
      "super admin assignment should have correct permission level",
      assignment.permission_level,
      permissionLevels[(index + 1) % permissionLevels.length],
    );
    TestValidator.equals(
      "super admin assignment should reference correct section",
      assignment.section.id,
      sections[(index + regularAdmins.length) % sections.length].id,
    );
  });
  // Test assignment date is recent
  const now = new Date();
  const allAssignments = [...regularAdminAssignments, ...superAdminAssignments];
  allAssignments.forEach((assignment, index) => {
    const assignmentDate = new Date(assignment.assignment_date);
    const timeDiff = Math.abs(now.getTime() - assignmentDate.getTime());
    TestValidator.predicate(
      `assignment ${index} should have recent assignment date`,
      timeDiff < 60000,
    ); // Within 1 minute
  });
  // Test boundary condition: Try to assign same admin to same section twice
  await TestValidator.error(
    "should not allow duplicate assignment",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.assignments.create(
        superAdminConnection,
        {
          sectionId: sections[0].id,
          body: {
            permission_level: "view",
            discussion_board_admin_id: regularAdmins[0].id,
            discussion_board_super_admin_id: null,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    },
  );
  // Test boundary condition: Try to assign with invalid permission level
  await TestValidator.error(
    "should not allow invalid permission level",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.assignments.create(
        superAdminConnection,
        {
          sectionId: sections[0].id,
          body: {
            permission_level: "invalid_permission_level",
            discussion_board_admin_id: regularAdmins[0].id,
            discussion_board_super_admin_id: null,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    },
  );
  // Test boundary condition: Try to assign with both admin IDs set
  await TestValidator.error(
    "should not allow both admin and super admin IDs",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.assignments.create(
        superAdminConnection,
        {
          sectionId: sections[0].id,
          body: {
            permission_level: "view",
            discussion_board_admin_id: regularAdmins[0].id,
            discussion_board_super_admin_id: additionalSuperAdmins[0].id,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    },
  );
  // Test boundary condition: Try to assign with neither admin ID set
  await TestValidator.error(
    "should not allow neither admin nor super admin ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.assignments.create(
        superAdminConnection,
        {
          sectionId: sections[0].id,
          body: {
            permission_level: "view",
            discussion_board_admin_id: null,
            discussion_board_super_admin_id: null,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    },
  );
}
