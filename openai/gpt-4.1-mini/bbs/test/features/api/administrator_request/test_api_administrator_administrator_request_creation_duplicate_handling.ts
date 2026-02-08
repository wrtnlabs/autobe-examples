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
import { generate_random_discussion_board_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_administrator_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_administrator_request_creation_duplicate_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to create a duplicate administrator request by the same authenticated administrator user
  // 1. Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Prepare admin connection with the access token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Generate a fixed UUID for registered_user_id to simulate the same user
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create the first administrator request
  const firstRequest: IDiscussionBoardAdministratorRequest =
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminConnection,
      {
        body: {
          registered_user_id: registeredUserId,
          reason: "Requesting administrator privilege",
        },
      },
    );
  typia.assert(firstRequest);
  // 5. Attempt to create a duplicate administrator request with the same registered_user_id. Should be rejected.
  await TestValidator.error(
    "Duplicate administrator request should be rejected",
    async () => {
      await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
        adminConnection,
        {
          body: {
            registered_user_id: registeredUserId,
            reason: "Duplicate request attempt",
          },
        },
      );
    },
  );
}
