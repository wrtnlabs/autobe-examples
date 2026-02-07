import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdministratorRequest";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_economy_politics_board_user_administrator_requests_create } from "../../../generate/generate_random_economy_politics_board_user_administrator_requests_create";
import { prepare_random_economy_politics_board_administrator_request } from "../../../prepare/prepare_random_economy_politics_board_administrator_request";

export async function test_api_user_administrator_request_submitted_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create user
  const userConnection: api.IConnection = { host: connection.host };
  const authorization: IEconomyPoliticsBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {},
    });
  const userId = authorization.id;
  // Submit administrator request with valid reason (10+ characters)
  const request =
    await generate_random_economy_politics_board_user_administrator_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(request);
  // Validate business logic
  TestValidator.equals("status is pending", request.status, "pending");
  TestValidator.notEquals("requestor not empty", request.requestor, null);
  TestValidator.equals(
    "requestor id matches user",
    request.requestor.id,
    userId,
  );
}
