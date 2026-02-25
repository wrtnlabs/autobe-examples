import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_sections_update(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful update of a discussion board section by an authorized administrator.
  // Scenario 2: Attempt to update section with a duplicate section name, expecting failure on uniqueness.
  // Scenario 3: Authorization failure for non-administrator.
  // 1. Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
    },
  });
  typia.assert(newAdmin);
  adminConnection.headers = { Authorization: newAdmin.token.access };
  // Prepare original section data by updating a known section
  const originalSectionName = `original-section-${RandomGenerator.alphabets(6)}`;
  const originalSectionDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  // Create or reset a section with original name for duplicate test
  // For test, update a section with random ID to original name and description
  const sectionIdForTest = typia.random<string & tags.Format<"uuid">>();
  try {
    const resetSection =
      await api.functional.discussionBoard.administrator.sections.update(
        adminConnection,
        {
          sectionId: sectionIdForTest,
          body: {
            name: originalSectionName,
            description: originalSectionDescription,
          },
        },
      );
    typia.assert(resetSection);
  } catch {
    /* ignoring failure if sectionId invalid, continue */
  }
  // Scenario 1: Successful update
  // Use distinct new name and description for update
  const updateSectionId = typia.random<string & tags.Format<"uuid">>();
  const newName = `unique-section-${RandomGenerator.alphabets(6)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedSection =
    await api.functional.discussionBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: updateSectionId,
        body: {
          name: newName,
          description: newDescription,
        },
      },
    );
  typia.assert(updatedSection);
  TestValidator.equals(
    "Section ID remains same",
    updatedSection.id,
    updateSectionId,
  );
  TestValidator.equals(
    "Section name matches update",
    updatedSection.name,
    newName,
  );
  TestValidator.equals(
    "Section description matches update",
    updatedSection.description,
    newDescription,
  );
  TestValidator.predicate(
    "Section updatedAt is valid date",
    !isNaN(Date.parse(updatedSection.updatedAt)),
  );
  TestValidator.predicate(
    "Section createdAt is valid date",
    !isNaN(Date.parse(updatedSection.createdAt)),
  );
  // Scenario 2: Attempt duplicate name update
  await TestValidator.error("Duplicate section name update error", async () => {
    await api.functional.discussionBoard.administrator.sections.update(
      adminConnection,
      {
        sectionId: updateSectionId,
        body: {
          name: originalSectionName, // duplicate name
        },
      },
    );
  });
  // Scenario 3: Unauthorized update with no admin login
  const baseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "Unauthorized update forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.sections.update(
        baseConnection,
        {
          sectionId: updateSectionId,
          body: {
            name: `hack-${RandomGenerator.alphabets(5)}`,
          },
        },
      );
    },
  );
}
