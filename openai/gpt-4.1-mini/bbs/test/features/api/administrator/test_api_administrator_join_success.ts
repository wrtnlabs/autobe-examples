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

export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a new connection (base connection)
  const administratorConnection: api.IConnection = { host: connection.host };
  // Generate test input for administrator join
  // Note: IDiscussionBoardAdministrator.IJoin does not specify any properties in the type, so generate an empty object
  const body: IDiscussionBoardAdministrator.IJoin = {};
  // Call the utility function to perform administrator join
  const authorized: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(administratorConnection, { body });
  // Assert the structure of the response using typia
  typia.assert(authorized);
  // Validate the token properties in the response
  const token = authorized.token;
  typia.assert<string>(token.access);
  typia.assert<string>(token.refresh);
  typia.assert<string & tags.Format<"date-time">>(token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(token.refreshable_until);
  // Confirm tokens are non-empty strings
  TestValidator.predicate("access token is non-empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is non-empty",
    token.refresh.length > 0,
  );
  // Confirm expiration ISO strings are parseable dates
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(Date.parse(token.refreshable_until)),
  );
}
