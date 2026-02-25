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
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_administrator_section_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join (register)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "Passw0rd!", // reasonable password
    },
  });
  typia.assert(admin);
  // 2. Create a new section
  const createdSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `Section_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdSection);
  // 3. Prepare update body with unique new name and description
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: `Updated_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  // 4. Update the section
  const updatedSection =
    await api.functional.discussionBoard.administrator.sections.updateSection(
      adminConnection,
      {
        sectionId: createdSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Verify the updated fields match the request
  TestValidator.equals(
    "updated section name",
    updatedSection.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated section description",
    updatedSection.description,
    updateBody.description,
  );
  TestValidator.equals(
    "section ID unchanged",
    updatedSection.id,
    createdSection.id,
  );
  // 6. Verify updatedSection has unique name (just that server accepted it, so it's the new name)
  // Additional database check is implicit since API returns updated entity
}
