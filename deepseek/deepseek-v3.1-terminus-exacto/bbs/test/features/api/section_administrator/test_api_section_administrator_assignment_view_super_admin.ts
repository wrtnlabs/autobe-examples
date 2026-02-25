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

export async function test_api_section_administrator_assignment_view_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for section creation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using available SDK function
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Create a new discussion board section
  const section = await api.functional.discussionBoard.admin.sections.create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create separate connection for second super administrator
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as second super administrator for assignment
  const secondSuperAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      secondSuperAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(secondSuperAdminAuth);
  // Assign the second super administrator to the section
  const assignment =
    await api.functional.discussionBoard.admin.sections.administrators.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "full",
          super_admin_id: secondSuperAdminAuth.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // Retrieve the assignment details using the super admin connection
  const retrievedAssignment =
    await api.functional.discussionBoard.admin.sections.administrators.at(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // Validate the assignment details
  TestValidator.equals(
    "assignment id matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "permission level matches",
    retrievedAssignment.permission_level,
    assignment.permission_level,
  );
  TestValidator.equals(
    "section id matches",
    retrievedAssignment.section.id,
    section.id,
  );
  // Validate super admin assignment details
  TestValidator.predicate(
    "super admin assignment exists",
    retrievedAssignment.superAdmin !== null,
  );
  TestValidator.predicate(
    "no regular admin assigned",
    retrievedAssignment.admin === null,
  );
  if (retrievedAssignment.superAdmin) {
    TestValidator.equals(
      "super admin id matches",
      retrievedAssignment.superAdmin.id,
      secondSuperAdminAuth.id,
    );
    // Remove email and display_name validations as they don't exist on ISummary type
    // These properties are only available on the full super admin object
  }
}