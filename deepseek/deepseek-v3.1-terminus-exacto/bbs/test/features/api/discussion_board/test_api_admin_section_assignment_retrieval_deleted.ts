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

export async function test_api_admin_section_assignment_retrieval_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
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
  // Create an assignment for the section using the authenticated admin
  const assignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "moderator",
          discussion_board_admin_id: adminAuth.id,
          discussion_board_super_admin_id: null,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // Soft-delete the assignment using utility function
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    adminConnection,
    {
      sectionId: section.id,
      assignmentId: assignment.id,
    },
  );
  // Retrieve the deleted assignment
  const retrievedAssignment =
    await api.functional.discussionBoard.admin.sections.assignments.at(
      adminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // Validate the assignment contains deleted_at timestamp
  TestValidator.predicate(
    "assignment should have deleted_at timestamp",
    retrievedAssignment.deleted_at !== null,
  );
  // Verify all other metadata remains intact
  TestValidator.equals(
    "assignment ID should match",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "permission level should match",
    retrievedAssignment.permission_level,
    assignment.permission_level,
  );
  TestValidator.equals(
    "section ID should match",
    retrievedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "assignment date should match",
    retrievedAssignment.assignment_date,
    assignment.assignment_date,
  );
  TestValidator.equals(
    "created at should match",
    retrievedAssignment.created_at,
    assignment.created_at,
  );
}
