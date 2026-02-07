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

export async function test_api_section_administrator_assignment_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create primary super administrator
  const primarySuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const primarySuperAdmin = await authorize_super_admin_join(
    primarySuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(primarySuperAdmin);
  // Create a section for assignment
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      primarySuperAdminConnection,
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
  // Create second super administrator for assignment
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(secondSuperAdmin);
  // Assign second super administrator to the section
  const assignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      primarySuperAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full_access",
          discussion_board_super_admin_id: secondSuperAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Validate assignment metadata
  TestValidator.equals(
    "assignment section matches",
    assignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "assigned super admin matches",
    assignment.superAdmin?.id,
    secondSuperAdmin.id,
  );
  TestValidator.equals("regular admin should be null", assignment.admin, null);
  TestValidator.predicate(
    "assignment date is set",
    assignment.assignment_date !== undefined,
  );
  TestValidator.predicate(
    "permission level is set",
    assignment.permission_level === "full_access",
  );
  // Test duplicate assignment prevention
  await TestValidator.error("duplicate assignment should fail", async () => {
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      primarySuperAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "read_only",
          discussion_board_super_admin_id: secondSuperAdmin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  });
  // Verify assigned super administrator can perform section operations
  const secondSection =
    await generate_random_discussion_board_super_admin_sections_create(
      secondSuperAdminConnection,
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
  typia.assert(secondSection);
  // Verify both super administrators maintain their elevated privileges
  TestValidator.predicate(
    "primary super admin maintains privileges",
    primarySuperAdmin.privilege_level === "super_admin",
  );
  TestValidator.predicate(
    "second super admin maintains privileges",
    secondSuperAdmin.privilege_level === "super_admin",
  );
}
