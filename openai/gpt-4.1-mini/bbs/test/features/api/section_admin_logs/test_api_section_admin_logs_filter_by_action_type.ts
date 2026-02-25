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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionAdminLog";
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

export async function test_api_section_admin_logs_filter_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: Partial<IDiscussionBoardAdministrator.IJoin> = {
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "P@ssw0rd1234!",
  };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // 2. Administrator creates a section to generate logs
  const rawSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `section-${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  const section: IDiscussionBoardSection = typia.assert(rawSection);
  // 3. Query section admin logs filtered by actionType='create' and sectionId
  const requestBody: IDiscussionBoardSectionAdminLog.IRequest = {
    actionType: "create",
    sectionId: section.id,
    page: 1,
    limit: 20,
  };
  const rawResponse =
    await api.functional.discussionBoard.administrator.sectionAdminLogs.index(
      adminConnection,
      { body: requestBody },
    );
  const response: IPageIDiscussionBoardSectionAdminLog.ISummary =
    typia.assert(rawResponse);
  // 4. Validate all logs have actionType 'create'
  response.data.forEach((log: IDiscussionBoardSectionAdminLog.ISummary) => {
    // Assert log type
    const assertedLog =
      typia.assert<IDiscussionBoardSectionAdminLog.ISummary>(log);
    TestValidator.equals(
      `log actionType is 'create' (log id: ${assertedLog.id})`,
      assertedLog.actionType,
      "create",
    );
    // Assert log.section is IDiscussionBoardSection
    const assertedSection = typia.assert<IDiscussionBoardSection>(
      assertedLog.section,
    );
    TestValidator.equals(
      `log sectionId matches created section (log id: ${assertedLog.id})`,
      assertedSection.id,
      section.id,
    );
  });
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current page positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
}
