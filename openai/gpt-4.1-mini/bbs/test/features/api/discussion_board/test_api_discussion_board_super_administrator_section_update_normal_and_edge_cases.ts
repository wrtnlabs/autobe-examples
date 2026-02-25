import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_sections_create } from "../../../generate/generate_random_discussion_board_super_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_super_administrator_section_update_normal_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully update section name and description by a super administrator
  {
    // Step 1: Authenticate as super administrator with join
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_administrator_join(
      superAdminConnection,
      {},
    );
    superAdminConnection.headers = { Authorization: superAdmin.token.access };
    // Step 2: Create a new section for update
    const originalSection =
      await generate_random_discussion_board_super_administrator_sections_create(
        superAdminConnection,
        {},
      );
    typia.assert(originalSection);
    // Step 3: Prepare update payload with unique new name and description
    const updateName = `${originalSection.name}_updated_${RandomGenerator.alphabets(5)}`;
    const updateDescription = RandomGenerator.paragraph({ sentences: 3 });
    const updateBody: IDiscussionBoardSection.IUpdate = {
      name: updateName,
      description: updateDescription,
    };
    // Step 4: Update the section
    const updatedSection =
      await api.functional.discussionBoard.superAdministrator.sections.updateSection(
        superAdminConnection,
        {
          sectionId: originalSection.id,
          body: updateBody,
        },
      );
    typia.assert(updatedSection);
    // Step 5: Validate updated fields
    TestValidator.equals(
      "updated section id",
      updatedSection.id,
      originalSection.id,
    );
    TestValidator.equals(
      "updated section name",
      updatedSection.name,
      updateName,
    );
    TestValidator.equals(
      "updated section description",
      updatedSection.description,
      updateDescription,
    );
    // Step 6: Verify updatedAt is newer than createdAt
    TestValidator.predicate(
      "updatedAt is newer than createdAt",
      new Date(updatedSection.updatedAt) >= new Date(updatedSection.createdAt),
    );
  }
  // Scenario 2: Attempt to update section with a duplicate name which already exists
  {
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_administrator_join(
      superAdminConnection,
      {},
    );
    superAdminConnection.headers = { Authorization: superAdmin.token.access };
    // Create two sections
    const firstSection =
      await generate_random_discussion_board_super_administrator_sections_create(
        superAdminConnection,
        {},
      );
    const secondSection =
      await generate_random_discussion_board_super_administrator_sections_create(
        superAdminConnection,
        {},
      );
    typia.assert(firstSection);
    typia.assert(secondSection);
    // Attempt to update the second section's name to first section's name (duplicate)
    const duplicateUpdateBody: IDiscussionBoardSection.IUpdate = {
      name: firstSection.name,
    };
    await TestValidator.httpError(
      "update duplicate section name returns 409 conflict",
      409,
      async () => {
        await api.functional.discussionBoard.superAdministrator.sections.updateSection(
          superAdminConnection,
          {
            sectionId: secondSection.id,
            body: duplicateUpdateBody,
          },
        );
      },
    );
  }
  // Scenario 3: Attempt to update a non-existing section by super administrator
  {
    const superAdminConnection: api.IConnection = { host: connection.host };
    const superAdmin = await authorize_super_administrator_join(
      superAdminConnection,
      {},
    );
    superAdminConnection.headers = { Authorization: superAdmin.token.access };
    // Prepare non-existing UUID
    const nonExistingSectionId = typia.random<string & tags.Format<"uuid">>();
    // Prepare any update body
    const updateBody: IDiscussionBoardSection.IUpdate = {
      name: `nonexistent_${RandomGenerator.alphabets(5)}`,
      description: RandomGenerator.paragraph({ sentences: 2 }),
    };
    await TestValidator.httpError(
      "update non-existing section returns 404 not found",
      404,
      async () => {
        await api.functional.discussionBoard.superAdministrator.sections.updateSection(
          superAdminConnection,
          {
            sectionId: nonExistingSectionId,
            body: updateBody,
          },
        );
      },
    );
  }
}
