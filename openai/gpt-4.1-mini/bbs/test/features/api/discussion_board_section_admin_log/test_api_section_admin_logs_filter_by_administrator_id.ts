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

export async function test_api_section_admin_logs_filter_by_administrator_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to create an authenticated admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpassword1234",
    },
  });
  typia.assert(admin);
  // 2. Use authenticated admin connection
  adminConnection.headers = { Authorization: admin.token.access };
  // 3. Create a new section as admin to generate section admin logs
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(section);
  // 4. Query section admin logs filtered by the specific administrator id
  const requestBody = {
    administratorId: admin.id,
    sectionId: section.id,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSectionAdminLog.IRequest;
  const response =
    await api.functional.discussionBoard.administrator.sectionAdminLogs.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 5. Assert pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be at most 20",
    response.pagination.limit <= 20,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count should be non-negative",
    response.pagination.records >= 0,
  );
  // 6. Verify that all returned logs correspond to the queried administratorId
  for (const log of response.data) {
    TestValidator.equals(
      "log administrator id matches filter",
      log.administrator.id,
      admin.id,
    );
    // Explicitly assert type here for section to access id
    const sectionOfLog = log.section as IDiscussionBoardSection;
    TestValidator.predicate(
      `log section id matches created section`,
      sectionOfLog.id === section.id,
    );
    TestValidator.predicate(
      `log actionType is non-empty`,
      log.actionType.length > 0,
    );
    TestValidator.predicate(
      `log createdAt is defined`,
      log.createdAt.length > 0,
    );
    TestValidator.predicate(
      `log updatedAt is defined`,
      log.updatedAt.length > 0,
    );
  }
}
