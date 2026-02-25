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

export async function test_api_section_administrator_assignment_view_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator account (will be used to create section)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {});
  typia.assert(admin1);
  // Create second administrator account (will be assigned to section)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  typia.assert(admin2);
  // Create a discussion board section
  const section = await generate_random_discussion_board_admin_sections_create(
    admin1Connection,
    {},
  );
  typia.assert(section);
  // Assign the second administrator to the section
  const assignment =
    await generate_random_discussion_board_admin_sections_administrators_create(
      admin1Connection,
      {
        body: {
          permission_level: "moderator",
          admin_id: admin2.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(assignment);
  // Retrieve the assignment details
  const retrievedAssignment =
    await api.functional.discussionBoard.admin.sections.administrators.at(
      admin1Connection,
      {
        sectionId: section.id,
        assignmentId: assignment.id,
      },
    );
  typia.assert(retrievedAssignment);
  // Validate assignment details
  TestValidator.equals(
    "assignment ID matches",
    retrievedAssignment.id,
    assignment.id,
  );
  TestValidator.equals(
    "permission level matches",
    retrievedAssignment.permission_level,
    "moderator",
  );
  TestValidator.equals(
    "section ID matches",
    retrievedAssignment.section.id,
    section.id,
  );
  // Validate administrator details
  TestValidator.equals(
    "admin ID matches",
    retrievedAssignment.admin!.id,
    admin2.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedAssignment.admin!.email,
    admin2.email,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedAssignment.admin!.display_name,
    admin2.display_name,
  );
  // Verify superAdmin field is null for regular administrator assignment
  TestValidator.equals(
    "superAdmin is null",
    retrievedAssignment.superAdmin,
    null,
  );
  // Validate assignment date is a valid ISO date-time format
  TestValidator.predicate(
    "assignment date is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      retrievedAssignment.assignment_date,
    ),
  );
}
