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

export async function test_api_section_update_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a superAdministrator connection and authorize join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Update connection headers
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // 2. Prepare a random UUID for sectionId that likely does not exist
  const randomSectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare a valid partial update body
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: `non-existing-section-${RandomGenerator.alphabets(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  // 4. Attempt to update the non-existent section and expect an HTTP 404 error
  await TestValidator.httpError(
    "update non-existent section returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.sections.update(
        superAdminConnection,
        {
          sectionId: randomSectionId,
          body: updateBody,
        },
      );
    },
  );
}
