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

const invalidUUID = "invalid-uuid";
const nonExistingUUID = typia.random<string & typia.tags.Format<"uuid">>();
export async function test_api_discussion_board_section_retrieval_not_found_invalid_id(
  connection: api.IConnection,
): Promise<void> {
  // Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `test${Date.now()}@test.com`,
      password: "P@ssw0rd12345",
    },
  });
  typia.assert(authorized);
  // Use adminConnection from now on (headers authorized)
  // Test 1: invalid UUID format
  await TestValidator.httpError(
    "section retrieval invalid UUID format",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.sections.at(
        adminConnection,
        {
          sectionId: invalidUUID as string & typia.tags.Format<"uuid">,
        },
      );
    },
  );
  // Test 2: non-existing valid UUID
  await TestValidator.httpError(
    "section retrieval non-existing UUID",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.sections.at(
        adminConnection,
        {
          sectionId: nonExistingUUID,
        },
      );
    },
  );
}
