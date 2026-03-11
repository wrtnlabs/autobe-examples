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

export async function test_api_section_update_topic_refinement_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin using join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // 2. Create a section as superAdmin using admin sections create endpoint
  const section = await api.functional.discussionBoard.admin.sections.create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Delete the section (soft delete)
  await api.functional.discussionBoard.admin.sections.erase(
    superAdminConnection,
    {
      sectionId: section.id,
    },
  );
  // 4. Attempt to update the deleted section - should fail
  await TestValidator.error(
    "superAdmin should not be able to update a deleted section",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            name: "Updated " + RandomGenerator.paragraph({ sentences: 2 }),
            description:
              "Updated " + RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
  // 5. Test updating a non-existent section ID - should fail
  await TestValidator.error(
    "superAdmin should not be able to update a non-existent section",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.update(
        superAdminConnection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.IUpdate,
        },
      );
    },
  );
  // 6. Create a new active section and verify it can be updated
  const newSection = await api.functional.discussionBoard.admin.sections.create(
    superAdminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(newSection);
  // 7. Update the active section successfully
  const updatedSection =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: newSection.id,
        body: {
          name:
            "Successfully Updated " +
            RandomGenerator.paragraph({ sentences: 2 }),
          description:
            "Successfully Updated " +
            RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // 8. Validate the update was successful
  TestValidator.notEquals(
    "section name should be updated",
    newSection.name,
    updatedSection.name,
  );
  TestValidator.notEquals(
    "section description should be updated",
    newSection.description,
    updatedSection.description,
  );
}
