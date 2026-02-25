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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test scenario 1 - Basic retrieval of section administration logs by a super administrator with valid filters and pagination.
 *
 * Steps:
 * 1. Perform super administrator join operation to authenticate.
 * 2. Create a discussion board section to have a valid section id.
 * 3. Call PATCH /discussionBoard/superAdministrator/sectionAdminLogs with filter criteria including sectionId, actionType, and page/limit for pagination.
 * 4. Verify the response contains paginated logs filtered by given parameters including administrator, section, actionType, timestamps, and pagination metadata.
 * 5. Validate access control: verify that only a super administrator can call this endpoint successfully.
 * 6. Check error handling for invalid filter parameters such as non-existent sectionId or malformed dates are covered internally (not 400 errors, so not tested explicitly here).
 */
export async function test_api_section_admin_logs_retrieval_superadministrator_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Super Administrator join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "TestPass123!",
        href: "http://localhost/join",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    },
  );
  typia.assert(superAdminAuth);
  // Use the updated token in connections
  superAdminConnection.headers = superAdminConnection.headers ?? {};
  superAdminConnection.headers["Authorization"] = superAdminAuth.token.access;
  // Step 2. Administrator join to create administration sections
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "TestAdminPass123!",
    },
  });
  typia.assert(adminJoin);
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers["Authorization"] = adminJoin.token.access;
  // Step 3. Create a new discussion board section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: `Section_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          description: "Test section for admin logs retrieval",
        },
      },
    );
  typia.assert(section);
  // Step 4. Query section admin logs filtered by sectionId, actionType
  const queryBody = {
    sectionId: section.id,
    actionType: "create",
    page: 1,
    limit: 10,
  } satisfies api.functional.discussionBoard.superAdministrator.sectionAdminLogs.index.Body;
  const logsResponse =
    await api.functional.discussionBoard.superAdministrator.sectionAdminLogs.index(
      superAdminConnection,
      { body: queryBody },
    );
  typia.assert(logsResponse);
  // Step 5. Validate response fields
  TestValidator.predicate(
    "pagination limit should be <= 10",
    logsResponse.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "current page should be 1",
    logsResponse.pagination.current === 1,
  );
  for (const log of logsResponse.data) {
    typia.assert(log);
    TestValidator.equals(
      "log section id matches",
      (log.section as IDiscussionBoardSection).id,
      section.id,
    );
    TestValidator.equals("log actionType matches", log.actionType, "create");
    TestValidator.predicate(
      "log has administrator",
      log.administrator !== null && typeof log.administrator.email === "string",
    );
    TestValidator.predicate(
      "log timestamps valid",
      new Date(log.createdAt).toString() !== "Invalid Date" &&
        new Date(log.updatedAt).toString() !== "Invalid Date",
    );
  }
  // Step 6. Validate access control - non-super admin should NOT access
  const unauthorizedCall = async () => {
    await api.functional.discussionBoard.superAdministrator.sectionAdminLogs.index(
      adminConnection,
      { body: queryBody },
    );
  };
  await TestValidator.error(
    "non-super admin cannot access section admin logs",
    unauthorizedCall,
  );
}
