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

export async function test_api_section_administrator_assignment_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create separate connections for each actor
  const assignerConnection: api.IConnection = { host: connection.host };
  const assigneeConnection: api.IConnection = { host: connection.host };
  // Step 1: Create two super administrators
  const assigner = await authorize_super_admin_join(assignerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(assigner);
  const assignee = await authorize_super_admin_join(assigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(assignee);
  // Step 2: Create a test section using assigner connection (super admin)
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      assignerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);
  // Step 3: Create the assignment (regular administrator assignment)
  // Since we're assigning a regular administrator, we use admin_id with assignee's ID
  // Permission levels like 'moderator' or 'admin' are typical
  const assignment =
    await generate_random_discussion_board_super_admin_sections_administrators_create(
      assignerConnection,
      {
        body: {
          permission_level: "moderator",
          admin_id: assignee.id satisfies string &
            tags.Format<"uuid"> as string & tags.Format<"uuid">,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(assignment);
  // Step 4: Validate the assignment response
  TestValidator.equals("assignment has id", typeof assignment.id, "string");
  TestValidator.predicate("id is UUID", /^[0-9a-f-]{36}$/i.test(assignment.id));
  TestValidator.equals(
    "permission_level matches",
    assignment.permission_level,
    "moderator",
  );
  TestValidator.predicate(
    "assignment_date is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(assignment.assignment_date),
  );
  // For regular administrator assignment, admin should be non-null
  TestValidator.predicate("admin field exists", assignment.admin !== null);
  if (assignment.admin) {
    TestValidator.equals(
      "admin id matches assignee",
      assignment.admin.id,
      assignee.id,
    );
    TestValidator.equals(
      "admin email matches",
      assignment.admin.email,
      assignee.email,
    );
  }
  // superAdmin should be null for regular administrator assignment
  TestValidator.equals("superAdmin is null", assignment.superAdmin, null);
  // Section should match
  TestValidator.equals("section id matches", assignment.section.id, section.id);
  TestValidator.equals(
    "section name matches",
    assignment.section.name,
    section.name,
  );
  // Timestamps should be valid
  TestValidator.predicate(
    "created_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(assignment.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(assignment.updated_at),
  );
  // deleted_at should be null for new assignment
  TestValidator.equals("deleted_at is null", assignment.deleted_at, null);
}
