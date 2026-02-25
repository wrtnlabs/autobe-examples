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
import { generate_random_discussion_board_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_admin_sections_administrators_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_section_administrator_update_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin connection and account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Create second admin connection and account for assignment
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // Create section using first admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Assign second admin to section with initial permission level
  const initialAssignment =
    await generate_random_discussion_board_admin_sections_administrators_create(
      adminConnection,
      {
        body: {
          permission_level: "basic",
          admin_id: admin2.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
        params: { sectionId: section.id },
      },
    );
  typia.assert(initialAssignment);
  // Update permission level to admin level
  const updatedAssignment =
    await api.functional.discussionBoard.admin.sections.administrators.update(
      adminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "admin",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Validate updated permission level
  TestValidator.equals(
    "permission level updated",
    updatedAssignment.permission_level,
    "admin",
  );
  // Validate admin relationship
  TestValidator.equals(
    "admin id matches",
    updatedAssignment.admin?.id,
    admin2.id,
  );
  TestValidator.equals(
    "admin email matches",
    updatedAssignment.admin?.email,
    admin2.email,
  );
  TestValidator.equals(
    "admin display name matches",
    updatedAssignment.admin?.display_name,
    admin2.display_name,
  );
  // Validate superAdmin is null (assignment is to regular admin)
  TestValidator.equals(
    "superAdmin should be null",
    updatedAssignment.superAdmin,
    null,
  );
  // Validate section relationship
  TestValidator.equals(
    "section id matches",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    updatedAssignment.section.name,
    section.name,
  );
  // Validate assignment date
  TestValidator.predicate(
    "assignment date is valid",
    () =>
      new Date(updatedAssignment.assignment_date) instanceof Date &&
      !isNaN(new Date(updatedAssignment.assignment_date).getTime()),
  );
  // Validate timestamp changes
  TestValidator.notEquals(
    "updated_at timestamp changed",
    initialAssignment.updated_at,
    updatedAssignment.updated_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    () =>
      new Date(updatedAssignment.updated_at) instanceof Date &&
      !isNaN(new Date(updatedAssignment.updated_at).getTime()),
  );
}
