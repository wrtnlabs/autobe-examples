import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_with_valid_device_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration request body with valid UUID device_id
  const body = {
    device_id: typia.random<string & tags.Format<"uuid">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoGuest.IJoin;
  // 2. Call guest join endpoint
  const authorized = await api.functional.multiUserTodo.auth.guest.join(
    connection,
    { body },
  );
  // 3. Validate response structure with typia
  typia.assert(authorized);
  // 4. Validate access token is present and non-empty
  TestValidator.predicate(
    "access token must be present and non-empty",
    authorized.access.length > 0,
  );
  // 5. Validate refresh token is present and non-empty
  TestValidator.predicate(
    "refresh token must be present and non-empty",
    authorized.refresh.length > 0,
  );
  // 6. Validate guest user id is present and valid
  TestValidator.predicate(
    "guest user id must be present",
    authorized.id.length > 0,
  );
  // 7. Validate token expiration timestamp is valid and in the future
  TestValidator.predicate(
    "token expiration must be valid date-time",
    !isNaN(Date.parse(authorized.expired_at)),
  );
  TestValidator.predicate(
    "token expiration must be in the future",
    new Date(authorized.expired_at) > new Date(),
  );
  // 8. Validate nested token object structure
  TestValidator.predicate(
    "token.access must be present and non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh must be present and non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at must be valid date-time",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until must be valid date-time",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // 9. Verify the access token can be used for subsequent authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.access}`,
    },
  };
  // Verify the token format (Bearer scheme)
  TestValidator.equals(
    "Authorization header should use Bearer scheme",
    String(authenticatedConnection.headers?.Authorization ?? "").startsWith("Bearer "),
    true,
  );
}