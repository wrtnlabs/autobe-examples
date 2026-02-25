import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_unban_record_delete_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized delete rejection for user unban record
  // Use raw base connection (no authorization) for this test
  // Generate a random unbanId (UUID format) to test unauthorized access
  const unbanId = typia.random<string & tags.Format<"uuid">>();
  // Attempt the delete operation without any authorization header
  // Expect an HTTP error with 401 or 403 status (Unauthorized or Forbidden)
  await TestValidator.httpError(
    "unauthorized unban delete rejected",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.administrator.unbans.erase(
        connection,
        { unbanId },
      );
    },
  );
}
