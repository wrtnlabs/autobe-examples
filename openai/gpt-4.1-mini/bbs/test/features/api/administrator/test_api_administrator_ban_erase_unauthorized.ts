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

export async function test_api_administrator_ban_erase_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Unauthorized ban erase attempt without administrator token
  // 1. Prepare a random UUID to simulate a ban ID
  // 2. Attempt to call the ban erase operation directly with the base connection
  //    (no administrator login or token)
  // 3. Expect the operation to throw an authorization HTTP error (status 401 or 403)
  const banId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized ban erase should fail",
    [401, 403],
    async () => {
      // Use base connection without setting authorization headers
      await api.functional.discussionBoard.administrator.administrator.bans.erase(
        connection,
        { banId },
      );
    },
  );
}
