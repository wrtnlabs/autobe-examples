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

export async function test_api_section_administrator_assignment_removal_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create primary administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const primaryAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Primary Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(primaryAdmin);
  // Create secondary administrator connection
  const secondaryAdminConnection: api.IConnection = { host: connection.host };
  const secondaryAdmin = await authorize_admin_join(secondaryAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Secondary Administrator",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(secondaryAdmin);
  // Create a section using primary administrator
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
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
  // Create administrator assignment using primary administrator
  const assignment =
    await api.functional.discussionBoard.admin.sections.administrators.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "moderator",
          admin_id: secondaryAdmin.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment);
  // Remove the administrator assignment
  await api.functional.discussionBoard.admin.sections.administrators.erase(
    adminConnection,
    {
      sectionId: section.id,
      assignmentId: assignment.id,
    },
  );
  // No additional validation needed as the successful API call indicates deletion
}
