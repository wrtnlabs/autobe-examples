import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

export async function test_api_administrator_request_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a non-existent administrator request ID returns 404 error and requires super administrator authorization
  // 1. Super Administrator Join and Authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // Add Authorization header with bearer token
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // 2. Prepare a non-existent UUID for requestId
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the administrator request by non-existent ID and expect HTTP 404 error
  await TestValidator.httpError(
    "super administrator retrieving non-existent administrator request should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.requests.at(
        superAdminConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}
