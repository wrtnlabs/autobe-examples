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
import { generate_random_discussion_board_admin_sections_assignments_create } from "../../../generate/generate_random_discussion_board_admin_sections_assignments_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_administrator } from "../../../prepare/prepare_random_discussion_board_section_administrator";

export async function test_api_section_assignment_permission_level_update(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator connection
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
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
  // Create second administrator connection
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
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
  // Create a section using the first administrator
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection1,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create initial assignment with lower permission level
  const initialAssignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection1,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "view_only",
          discussion_board_admin_id: admin2.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // Update the assignment with higher permission level
  const updatedAssignment =
    await api.functional.discussionBoard.admin.sections.assignments.update(
      adminConnection1,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "full_control",
          discussion_board_admin_id: admin2.id,
        } satisfies IDiscussionBoardSectionAdministrator.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // Validate permission level update
  TestValidator.equals(
    "permission level updated",
    updatedAssignment.permission_level,
    "full_control",
  );
  TestValidator.notEquals(
    "permission level changed",
    updatedAssignment.permission_level,
    initialAssignment.permission_level,
  );
  // Validate administrator reference remains unchanged
  TestValidator.equals(
    "admin reference unchanged",
    updatedAssignment.admin?.id,
    initialAssignment.admin?.id,
  );
  // Validate section relationship preserved
  TestValidator.equals(
    "section reference unchanged",
    updatedAssignment.section.id,
    section.id,
  );
  // Validate updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    new Date(updatedAssignment.updated_at) >
      new Date(initialAssignment.updated_at),
  );
}
