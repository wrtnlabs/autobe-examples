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

/**
 * Test successful assignment of a regular administrator to a discussion board section.
 * 1. Authenticate as an admin
 * 2. Create a target section for administrator assignment
 * 3. Create a regular administrator account to be assigned
 * 4. Execute the assignment with valid permission level
 * 5. Validate the assignment record and linked administrator details
 */
export async function test_api_section_administration_regular_admin_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an admin
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
  // 2. Create target section for assignment
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create regular administrator account to be assigned
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 4. Execute the assignment with valid permission level
  const assignment =
    await generate_random_discussion_board_admin_sections_administrators_create(
      adminConnection,
      {
        body: {
          permission_level: "moderator",
          admin_id: regularAdmin.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(assignment);
  // 5. Validate the assignment record and linked administrator details
  TestValidator.equals(
    "permission level",
    assignment.permission_level,
    "moderator",
  );
  TestValidator.predicate(
    "assignment date should be valid",
    () => new Date(assignment.assignment_date).getTime() > 0,
  );
  TestValidator.notEquals("admin should be populated", assignment.admin, null);
  TestValidator.equals(
    "admin ID should match",
    assignment.admin!.id,
    regularAdmin.id,
  );
  TestValidator.equals(
    "section ID should match",
    assignment.section.id,
    section.id,
  );
  TestValidator.predicate(
    "created at should be valid",
    () => new Date(assignment.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at should be valid",
    () => new Date(assignment.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted at should be null for active assignment",
    assignment.deleted_at,
    null,
  );
}
