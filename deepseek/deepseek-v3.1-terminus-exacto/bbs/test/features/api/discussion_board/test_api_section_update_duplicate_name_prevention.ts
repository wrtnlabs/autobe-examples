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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_update_duplicate_name_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first section
  const firstSection =
    await generate_random_discussion_board_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // Create second section with different name
  const secondSection =
    await generate_random_discussion_board_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(secondSection);
  // Attempt to rename first section to match second section's name
  await TestValidator.error(
    "duplicate section name should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        superAdminConnection,
        {
          sectionId: firstSection.id,
          body: {
            name: secondSection.name,
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
  // Test case-insensitive matching
  await TestValidator.error(
    "case-insensitive duplicate should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        superAdminConnection,
        {
          sectionId: firstSection.id,
          body: {
            name: "politics",
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
  // Verify sections remain unchanged by attempting valid updates
  const firstSectionValidUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: firstSection.id,
        body: {
          name: "Updated Politics",
          description: "Updated political discussions",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(firstSectionValidUpdate);
  TestValidator.equals(
    "first section should accept valid name change",
    firstSectionValidUpdate.name,
    "Updated Politics",
  );
  const secondSectionValidUpdate =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: secondSection.id,
        body: {
          name: "Updated Economy",
          description: "Updated economic discussions",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(secondSectionValidUpdate);
  TestValidator.equals(
    "second section should accept valid name change",
    secondSectionValidUpdate.name,
    "Updated Economy",
  );
}
