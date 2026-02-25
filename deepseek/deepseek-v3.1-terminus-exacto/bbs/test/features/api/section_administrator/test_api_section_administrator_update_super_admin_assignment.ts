import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_admin_sections_administrators_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_section_administrator_update_super_admin_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        href: "http://localhost/test",
        referrer: "http://localhost",
        ip: undefined,
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminAuth);
  // Create regular administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost/test",
      referrer: "http://localhost",
      ip: undefined,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // Create a section
  const section = await api.functional.discussionBoard.admin.sections.create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Assign super administrator to the section
  const initialAssignment =
    await api.functional.discussionBoard.admin.sections.administrators.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "read_only",
          admin_id: null,
          super_admin_id: superAdminAuth.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // Update the permission level using regular administrator
  const updatedAssignment =
    await api.functional.discussionBoard.admin.sections.administrators.update(
      adminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "full_access",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Validate the update
  TestValidator.equals(
    "permission level updated",
    updatedAssignment.permission_level,
    "full_access",
  );
  TestValidator.equals("admin should be null", updatedAssignment.admin, null);
  TestValidator.notEquals(
    "superAdmin should not be null",
    updatedAssignment.superAdmin,
    null,
  );
  TestValidator.equals(
    "section relationship unchanged",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "assignment date unchanged",
    updatedAssignment.assignment_date,
    initialAssignment.assignment_date,
  );
  TestValidator.equals(
    "super administrator unchanged",
    updatedAssignment.superAdmin?.id,
    superAdminAuth.id,
  );
}