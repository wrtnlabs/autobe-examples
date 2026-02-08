import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_detail_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Attempt to retrieve a non-existing administrator request
  const invalidRequestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator request retrieval with non-existing requestId",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administratorRequests.at(
        adminConnection,
        {
          requestId: invalidRequestId,
        },
      );
    },
  );
}
