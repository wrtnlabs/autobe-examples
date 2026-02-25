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

export async function test_api_section_administrator_details_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using join utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000/discussionBoard",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(authorizedSuperAdmin);
  // 2. Create a section as prerequisite
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Assign an administrator to the section
  const assignment =
    await generate_random_discussion_board_super_admin_sections_administrators_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full",
          super_admin_id: authorizedSuperAdmin.id,
          admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // 4. Retrieve the assignment details
  const retrievedAssignment =
    await api.functional.discussionBoard.superAdmin.sections.administrators.at(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // 5. Validate the response structure and content
  TestValidator.equals(
    "assignment ID matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "permission level matches",
    retrievedAssignment.permission_level,
    assignment.permission_level,
  );
  TestValidator.equals(
    "section ID matches",
    retrievedAssignment.section.id,
    section.id,
  );
  TestValidator.predicate(
    "superAdmin assignment exists",
    retrievedAssignment.superAdmin !== null,
  );
  TestValidator.notEquals(
    "superAdmin ID matches superAdmin user",
    retrievedAssignment.superAdmin?.id,
    authorizedSuperAdmin.id,
  );
  TestValidator.predicate(
    "assignment date is valid",
    retrievedAssignment.assignment_date !== null,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    retrievedAssignment.created_at !== null,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    retrievedAssignment.updated_at !== null,
  );
}
