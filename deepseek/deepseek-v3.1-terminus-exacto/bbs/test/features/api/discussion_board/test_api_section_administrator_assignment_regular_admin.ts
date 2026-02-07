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
 * Test the successful assignment of a regular administrator to manage a discussion board section.
 * The scenario validates that a super administrator can assign a regular administrator to a section
 * with appropriate permission levels. The test creates a section first, then creates a regular
 * administrator account, and finally assigns the administrator to the section. Verifies that
 * the assignment record is created with correct permission level, assignment date, and
 * administrator references.
 */
export async function test_api_section_administrator_assignment_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section for assignment
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Assign regular administrator to the section
  const assignment =
    await generate_random_discussion_board_super_admin_sections_assignments_create(
      superAdminConnection,
      {
        params: {
          sectionId: section.id,
        },
        body: {
          permission_level: "full_access",
          discussion_board_admin_id: admin.id,
          discussion_board_super_admin_id: undefined,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Validate assignment details
  TestValidator.equals("section ID matches", assignment.section.id, section.id);
  TestValidator.equals(
    "permission level correct",
    assignment.permission_level,
    "full_access",
  );
  TestValidator.equals("admin ID matches", assignment.admin?.id, admin.id);
  TestValidator.predicate(
    "super admin should be null",
    assignment.superAdmin === null,
  );
  TestValidator.predicate(
    "assignment date should be set",
    assignment.assignment_date !== null,
  );
  TestValidator.predicate(
    "created at should be set",
    assignment.created_at !== null,
  );
  TestValidator.predicate(
    "updated at should be set",
    assignment.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted at should be null for active assignment",
    assignment.deleted_at === null,
  );
}
