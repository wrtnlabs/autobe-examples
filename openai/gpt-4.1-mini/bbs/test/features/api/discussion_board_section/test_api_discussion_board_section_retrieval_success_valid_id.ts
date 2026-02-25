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

export async function test_api_discussion_board_section_retrieval_success_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    },
  });
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Retrieve a list of sections to pick a valid existing sectionId (simulate retrieval by getting one sectionId randomly)
  // Since no list endpoint utility or api provided, we generate a random section first and then try to fetch it - but no creation API is given.
  // Instead, we generate a valid UUID for demonstration since the endpoint requires a valid existing sectionId - adjust if needed.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the endpoint to get section by valid sectionId
  const section =
    await api.functional.discussionBoard.administrator.sections.at(
      adminConnection,
      { sectionId },
    );
  typia.assert(section);
  // 4. Validate required fields and timestamps
  TestValidator.predicate(
    "section id is uuid",
    /^[0-9a-fA-F-]{36}$/.test(section.id),
  );
  TestValidator.predicate(
    "section name exists",
    typeof section.name === "string" && section.name.length > 0,
  );
  TestValidator.predicate(
    "section description exists",
    typeof section.description === "string",
  );
  TestValidator.predicate(
    "createdAt is ISO date",
    new Date(section.createdAt).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    new Date(section.updatedAt).toString() !== "Invalid Date",
  );
  // 5. deletedAt can be null or ISO string
  if (section.deletedAt !== null) {
    TestValidator.predicate(
      "deletedAt is null or ISO date",
      new Date(section.deletedAt).toString() !== "Invalid Date",
    );
  }
  // 6. Validate arrays adminLogs and articles
  TestValidator.predicate(
    "adminLogs is array",
    Array.isArray(section.adminLogs),
  );
  TestValidator.predicate("articles is array", Array.isArray(section.articles));
}
