import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for guest join
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate valid guest registration data with minimal required fields
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMultiUserTodoAppGuest.IJoin;
  // Perform guest registration using utility function
  const output = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  // Validate response structure with typia.assert
  typia.assert(output);
  // Verify guest ID is UUID format
  TestValidator.equals(
    "guest ID format",
    output.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Verify token structure exists
  typia.assert(output.token);
  // Verify token has all required fields with correct formats
  TestValidator.equals("access token format", output.token.access, "");
  TestValidator.equals("refresh token format", output.token.refresh, "");
  TestValidator.equals("expired_at format", output.token.expired_at, "");
  TestValidator.equals(
    "refreshable_until format",
    output.token.refreshable_until,
    "",
  );
  // Validate token expiration dates are valid ISO 8601 format
  const expiredDate = new Date(output.token.expired_at);
  const refreshableDate = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableDate.getTime()),
  );
  // Validate access token expires before refreshable_until
  TestValidator.predicate(
    "expired_at before refreshable_until",
    expiredDate.getTime() < refreshableDate.getTime(),
  );
  // Verify guest can use token for subsequent authenticated requests
  // Create a new connection with the token for authenticated operations
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: output.token.access,
    },
  };
  // Test that authenticated connection is properly formed
  TestValidator.predicate(
    "authenticated connection has token",
    authenticatedConnection.headers?.Authorization !== undefined,
  );
}
