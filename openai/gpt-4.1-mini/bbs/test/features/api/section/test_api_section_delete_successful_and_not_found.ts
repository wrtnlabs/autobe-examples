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

export async function test_api_section_delete_successful_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully delete an existing discussion board section
  // Authenticate as superAdministrator via join endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // authorize_super_administrator_join updates headers internally
  // Create a new discussion board section
  const createdSection =
    await generate_random_discussion_board_super_administrator_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(createdSection);
  // Delete the newly created section by its sectionId
  await api.functional.discussionBoard.superAdministrator.sections.erase(
    superAdminConnection,
    {
      sectionId: createdSection.id,
    },
  );
  // Confirm the section no longer exists by attempting to delete it again
  await TestValidator.error(
    "delete non-existent section should fail with 404",
    async () => {
      await api.functional.discussionBoard.superAdministrator.sections.erase(
        superAdminConnection,
        {
          sectionId: createdSection.id,
        },
      );
    },
  );
  // Scenario 2: Attempt to delete a section that does not exist
  // Generate a random UUID that does not exist
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent section by random UUID should fail with 404",
    async () => {
      await api.functional.discussionBoard.superAdministrator.sections.erase(
        superAdminConnection,
        {
          sectionId: nonExistentSectionId,
        },
      );
    },
  );
}
