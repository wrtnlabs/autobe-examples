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

export async function test_api_section_admin_logs_filter_by_creation_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: RandomGenerator.alphaNumeric(16) + "@example.com",
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // Overwrite adminConnection headers with access token
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Create a new discussion board section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3) + "_filtertest",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 3. Define creation date range for filtering
  //    Using timestamps around section.createdAt for filtering
  const createdAtDate = new Date(section.createdAt);
  const createdAtGte = new Date(createdAtDate.getTime() - 1000 * 60 * 60); // 1 hour before
  const createdAtLte = new Date(createdAtDate.getTime() + 1000 * 60 * 60); // 1 hour after
  // 4. Query section admin logs with date filters and sectionId
  const body: IDiscussionBoardSectionAdminLog.IRequest = {
    sectionId: section.id,
    createdAtGte: createdAtGte.toISOString(),
    createdAtLte: createdAtLte.toISOString(),
    page: 1,
    limit: 10,
  };
  const logsResponse: IPageIDiscussionBoardSectionAdminLog.ISummary =
    await api.functional.discussionBoard.administrator.sectionAdminLogs.index(
      adminConnection,
      { body },
    );
  typia.assert(logsResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    logsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    logsResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    logsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    logsResponse.pagination.records >= 0,
  );
  // 6. Validate each log has createdAt within the date range and references correct section
  for (const log of logsResponse.data) {
    typia.assert(log);
    TestValidator.predicate(
      `log ${log.id} createdAt >= createdAtGte`,
      new Date(log.createdAt) >= createdAtGte,
    );
    TestValidator.predicate(
      `log ${log.id} createdAt <= createdAtLte`,
      new Date(log.createdAt) <= createdAtLte,
    );
    // Validate that log.section is defined (type-safe)
    TestValidator.predicate(
      `log ${log.id} section is defined`,
      log.section !== null && log.section !== undefined,
    );
  }
}
