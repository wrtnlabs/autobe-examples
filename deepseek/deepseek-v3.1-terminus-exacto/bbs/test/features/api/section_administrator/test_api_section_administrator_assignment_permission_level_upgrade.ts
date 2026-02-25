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

export async function test_api_section_administrator_assignment_permission_level_upgrade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await api.functional.discussionBoard.auth.superAdmin.join(
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
  typia.assert(superAdmin);
  // 2. Create a section for administrator assignment
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create initial administrator assignment with lower permission level
  const initialAssignment =
    await api.functional.discussionBoard.superAdmin.sections.administrators.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "read_only",
          super_admin_id: superAdmin.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(initialAssignment);
  // 4. Upgrade permission level to higher level
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.sections.administrators.update(
      superAdminConnection,
      {
        sectionId: section.id,
        assignmentId: initialAssignment.id,
        body: {
          permission_level: "full_access",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  typia.assert(updatedAssignment);
  // 5. Validate the updated assignment
  TestValidator.equals(
    "assignment ID unchanged",
    updatedAssignment.id,
    initialAssignment.id,
  );
  TestValidator.equals(
    "section ID unchanged",
    updatedAssignment.section.id,
    section.id,
  );
  TestValidator.equals(
    "permission level upgraded",
    updatedAssignment.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "assignment date unchanged",
    updatedAssignment.assignment_date,
    initialAssignment.assignment_date,
  );
  TestValidator.predicate(
    "updated_at timestamp updated",
    updatedAssignment.updated_at > initialAssignment.updated_at,
  );
  TestValidator.equals(
    "super admin reference maintained",
    updatedAssignment.superAdmin?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "regular admin remains null",
    updatedAssignment.admin,
    null,
  );
}
