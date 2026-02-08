import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_user_unban_retrieve_details_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Attempt retrieval with a random valid UUID (which is unlikely to exist) to check 404
  await TestValidator.httpError(
    "retrieve non-existent user unban returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.at(
        adminConnection,
        {
          unbanId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Since the system doesn't provide a creation method for user unbans,
  // we need to simulate or assume fetching an existing unban ID.
  // For this E2E test, we will simulate by calling the API with a random
  // UUID and expect not error to enforce further testing.
  // However, according to the scenario, it's expected we have a valid unbanId.
  // Given the constraints and no creation API for unbans, test only 404 handling and unauthorized.
  // 4. Validate unauthorized user cannot access the endpoint
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized user cannot retrieve user unban details",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.userUnbans.at(
        invalidConnection,
        {
          unbanId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // If the API allowed creation or listing of user unbans, we would create an unban
  // and retrieve it here to test full positive flow, but such APIs are not provided.
  // Therefore, this test validates the security and error handling aspects,
  // consistent with the available API capabilities.
}
