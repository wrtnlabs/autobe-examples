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

export async function test_api_discussion_board_section_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize super administrator through join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Set the bearer token in the authorized connection
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Retrieve a random existing discussion board section ID using the GET /sections endpoint
  // Since no utility to list sections exists, use a random UUID for testing
  // But ideally should retrieve an existing section to test success; we will use typia.random to generate a valid UUID
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string & tags.Format<"uuid">;
  // 3. Call the target endpoint GET /discussionBoard/superAdministrator/sections/{sectionId}
  const section =
    await api.functional.discussionBoard.superAdministrator.sections.at(
      superAdminConnection,
      { sectionId },
    );
  typia.assert(section);
  // 4. Validate that response has expected properties
  // At minimum, check presence and types
  TestValidator.predicate(
    "section has name",
    typeof section.name === "string" && section.name.length > 0,
  );
  TestValidator.predicate(
    "section has description",
    typeof section.description === "string",
  );
  TestValidator.predicate(
    "section has createdAt in ISO 8601 format",
    typeof section.createdAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(section.createdAt),
  );
  TestValidator.predicate(
    "section has updatedAt in ISO 8601 format",
    typeof section.updatedAt === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(section.updatedAt),
  );
  TestValidator.predicate(
    "section deletedAt is either null or ISO 8601 string",
    section.deletedAt === null ||
      (typeof section.deletedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
          section.deletedAt,
        )),
  );
  TestValidator.predicate(
    "section has adminLogs array",
    Array.isArray(section.adminLogs),
  );
  TestValidator.predicate(
    "section has articles array",
    Array.isArray(section.articles),
  );
}
