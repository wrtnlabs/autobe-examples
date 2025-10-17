import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration(connection: api.IConnection) {
  const output: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection);
  typia.assert(output);

  // Validate user ID is a valid UUID format
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );

  // Validate token structure
  TestValidator.equals(
    "token has access property",
    output.token.access,
    output.token.access,
  );
  TestValidator.equals(
    "token has refresh property",
    output.token.refresh,
    output.token.refresh,
  );
  TestValidator.predicate(
    "access token expiration is valid date-time",
    /^(?:[0-9]{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])$/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token expiration is valid date-time",
    /^(?:[0-9]{4})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(?:Z|[+-][01][0-9]:[0-5][0-9])$/.test(
      output.token.refreshable_until,
    ),
  );
}
