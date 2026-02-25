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

export async function test_api_section_update_name_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. SuperAdministrator join for authorization
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {},
  );
  // 2. Create an authorized connection with token for superAdministrator
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdminAuthorized.token.access}` },
  };
  // 3. Create initial section to be updated
  const initialSection =
    await generate_random_discussion_board_super_administrator_sections_create(
      authorizedConnection,
      {},
    );
  typia.assert(initialSection);
  // 4. Create another section with a conflicting name (will be used to test name uniqueness violation)
  const conflictingSection =
    await generate_random_discussion_board_super_administrator_sections_create(
      authorizedConnection,
      {
        body: { name: initialSection.name + "_conflict" },
      },
    );
  typia.assert(conflictingSection);
  // 5. Attempt to update the conflicting section's name to the initial section's name to cause uniqueness violation
  await TestValidator.error(
    "update section name uniqueness violation",
    async () => {
      await api.functional.discussionBoard.superAdministrator.sections.update(
        authorizedConnection,
        {
          sectionId: conflictingSection.id,
          body: { name: initialSection.name },
        },
      );
    },
  );
}
