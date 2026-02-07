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

/**
 * Test the successful removal of an administrator assignment from a section by an authorized administrator.
 * Validates that when an administrator with proper permissions attempts to remove an assignment from a section
 * they manage, the operation succeeds and the assignment is soft-deleted (deleted_at timestamp set).
 */
export async function test_api_section_assignment_removal_by_authorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as an administrator
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
  // 2. Create a section for assignment management
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
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
  // 3. Create an administrator assignment to the section
  const assignment =
    await generate_random_discussion_board_admin_sections_assignments_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "section_manager",
          discussion_board_admin_id: admin.id,
        } satisfies IDiscussionBoardSectionAdministrator.ICreate,
      },
    );
  typia.assert(assignment);
  // 4. Remove the assignment using the erase endpoint
  await api.functional.discussionBoard.admin.sections.assignments.erase(
    adminConnection,
    {
      sectionId: section.id,
      assignmentId: assignment.id,
    },
  );
  // 5. Verify that subsequent attempts to access the deleted assignment fail appropriately
  await TestValidator.error(
    "should fail to access deleted assignment",
    async () => {
      await api.functional.discussionBoard.admin.sections.assignments.create(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            permission_level: "section_manager",
            discussion_board_admin_id: admin.id,
          } satisfies IDiscussionBoardSectionAdministrator.ICreate,
        },
      );
    },
  );
}
