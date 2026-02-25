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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_administrators_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_section_administrator_assignment_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create first super administrator who will perform the assignment
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  // Create second super administrator who will be assigned to the section
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin456",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // Create a new section using the first super administrator
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdmin1Connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies Partial<IDiscussionBoardSection.ICreate>,
      },
    );
  typia.assert(section);
  // Assign the second super administrator to the section
  const assignment =
    await generate_random_discussion_board_super_admin_sections_administrators_create(
      superAdmin1Connection,
      {
        body: {
          permission_level: "full_access",
          super_admin_id: superAdmin2.id,
          admin_id: null,
        } satisfies Partial<IDiscussionBoardSuperAdmin.ICreate>,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(assignment);
  // Validate the assignment response
  TestValidator.equals(
    "permission level should match request",
    assignment.permission_level,
    "full_access",
  );
  TestValidator.predicate(
    "assignment date should be a valid ISO string",
    new Date(assignment.assignment_date).toString() !== "Invalid Date",
  );
  // Validate super administrator linkage
  TestValidator.notEquals(
    "superAdmin should not be null",
    assignment.superAdmin,
    null,
  );
  if (assignment.superAdmin) {
    TestValidator.equals(
      "assigned super admin ID should match",
      assignment.superAdmin.id,
      superAdmin2.id,
    );
    TestValidator.equals(
      "assigned super admin permission level should match",
      assignment.superAdmin.permission_level,
      "full_access",
    );
  }
  // Validate section linkage
  TestValidator.equals(
    "section ID should match created section",
    assignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name should match",
    assignment.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description should match",
    assignment.section.description,
    section.description,
  );
}
