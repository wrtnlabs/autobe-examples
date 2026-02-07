import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_administrator_assignments_filter_by_permission_level(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section
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
  // Test filtering by different permission levels
  const permissionLevels = ["moderator", "editor", "manager"] as const;
  for (const permissionLevel of permissionLevels) {
    const searchResult =
      await api.functional.discussionBoard.admin.sections.assignments.index(
        adminConnection,
        {
          sectionId: section.id,
          body: {
            permission_level: permissionLevel,
          } satisfies IDiscussionBoardSectionAdministrator.IRequest,
        },
      );
    typia.assert(searchResult);
    // Validate that all returned assignments have the exact permission level
    for (const assignment of searchResult.data) {
      TestValidator.equals(
        `assignment permission level should be ${permissionLevel}`,
        assignment.permission_level,
        permissionLevel,
      );
    }
  }
  // Test filtering with non-existent permission level
  const nonExistentSearchResult =
    await api.functional.discussionBoard.admin.sections.assignments.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "non-existent-permission-level",
        } satisfies IDiscussionBoardSectionAdministrator.IRequest,
      },
    );
  typia.assert(nonExistentSearchResult);
  // Should return empty data array for non-existent permission level
  TestValidator.equals(
    "non-existent permission level should return empty results",
    nonExistentSearchResult.data.length,
    0,
  );
}
