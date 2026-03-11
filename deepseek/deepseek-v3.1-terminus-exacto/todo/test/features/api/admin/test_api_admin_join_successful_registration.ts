import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new admin account using the utility function
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Validate the complete response structure - this performs ALL validation
  typia.assert(authorized);
  // Verify business logic: admin account is active and tokens are properly set
  TestValidator.equals(
    "deleted_at is null for active account",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "tokens are properly set",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );
  // Verify token expiration times are in the future (business logic validation)
  const now = new Date();
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    new Date(authorized.token.refreshable_until) > now,
  );
}
