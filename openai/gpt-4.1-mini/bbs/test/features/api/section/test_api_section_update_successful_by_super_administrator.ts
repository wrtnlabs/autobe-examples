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

export async function test_api_section_update_successful_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdministrator actor connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinOutput = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdminJoinOutput);
  // Update superAdminConnection with authorization token
  superAdminConnection.headers = {
    Authorization: superAdminJoinOutput.token.access,
  };
  // 2. Create a new section to update
  const createdSection =
    await generate_random_discussion_board_super_administrator_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(createdSection);
  // 3. Prepare update payload with new name and description
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  // 4. Perform section update via API
  const updatedSection =
    await api.functional.discussionBoard.superAdministrator.sections.update(
      superAdminConnection,
      {
        sectionId: createdSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 5. Verify updated section fields
  TestValidator.equals(
    "section id remains unchanged",
    updatedSection.id,
    createdSection.id,
  );
  TestValidator.equals(
    "section name updated",
    updatedSection.name,
    updateBody.name,
  );
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "updatedAt updated",
    new Date(updatedSection.updatedAt).getTime() >
      new Date(createdSection.updatedAt).getTime(),
  );
  TestValidator.predicate(
    "createdAt remains unchanged",
    updatedSection.createdAt === createdSection.createdAt,
  );
  // 6. Verify audit log contains update action
  // The adminLogs should include an entry with actionType 'update' and matching section id
  const updateLog = updatedSection.adminLogs.find(
    (log) => log.actionType === "update",
  );
  TestValidator.predicate("update log found", updateLog !== undefined);
  if (updateLog) {
    TestValidator.equals(
      "update log section id",
      (updateLog.section as IDiscussionBoardSection).id,
      updatedSection.id,
    );
    TestValidator.predicate(
      "update log has admin",
      updateLog.administrator !== null && updateLog.administrator !== undefined,
    );
    TestValidator.predicate(
      "update log createdAt valid",
      new Date(updateLog.createdAt).getTime() > 0,
    );
  }
}
