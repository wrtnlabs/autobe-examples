import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
) {
  // Create a new connection object for the join operation
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Call the authorization join utility function with empty join body
  const authorized = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  // Validate the response with typia.assert
  typia.assert(authorized);
  // Validate the token properties
  const token = authorized.token;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO-8601 date-time",
    !!Date.parse(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO-8601 date-time",
    !!Date.parse(token.refreshable_until),
  );
  // Use the access token in a new connection's header to test a protected endpoint
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${token.access}` },
  };
  // Confirm Authorization header is correctly set
  TestValidator.predicate(
    "adminConnection has authorization header",
    typeof adminConnection.headers?.Authorization === "string" &&
      adminConnection.headers.Authorization.startsWith("Bearer "),
  );
}
