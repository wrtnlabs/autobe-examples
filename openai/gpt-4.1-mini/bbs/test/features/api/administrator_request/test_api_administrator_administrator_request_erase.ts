import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_request_erase(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Skipped because no API for creating administrator requests is available.
  // Scenario 2: Deletion attempt for a non-existing administrator request
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized: IDiscussionBoardAdministrator.IAuthorized =
      await authorize_administrator_join(adminConnection, {
        body: {},
      });
    adminConnection.headers = {
      Authorization: `Bearer ${authorized.token.access}`,
    };
    // Attempt to delete a non-existing request
    const fakeRequestId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.error(
      "delete non-existing administrator request",
      async () => {
        await api.functional.discussionBoard.administrator.administratorRequests.erase(
          adminConnection,
          {
            requestId: fakeRequestId,
          },
        );
      },
    );
  }
  // Scenario 3: Deletion attempt by unauthorized user
  {
    // Use base connection with no authorization headers
    const fakeRequestId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "delete administrator request without authorization",
      403,
      async () => {
        await api.functional.discussionBoard.administrator.administratorRequests.erase(
          connection,
          {
            requestId: fakeRequestId,
          },
        );
      },
    );
  }
}
