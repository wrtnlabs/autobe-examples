import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_creation_with_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique test credentials for admin registration
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  // 2. Create actor-specific connection for admin join operation
  const adminConnection: api.IConnection = { host: connection.host };
  // 3. Execute admin join and capture response
  const result = await authorize_admin_join(adminConnection, { body });
  typia.assert(result);
  // 4. Validate JWT access token
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "access token is JWT format",
    result.token.access.includes("."),
  );
  // 5. Validate JWT refresh token
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refresh token is JWT format",
    result.token.refresh.includes("."),
  );
  // 6. Validate token expiration timestamps
  TestValidator.predicate(
    "access token expiration set",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token expiration set",
    result.token.refreshable_until !== undefined,
  );
  // 7. Validate admin account identifier
  TestValidator.predicate(
    "admin id exists",
    result.id !== undefined && result.id.length > 0,
  );
  // 8. Validate admin email
  TestValidator.predicate("email exists", result.email !== undefined);
  TestValidator.equals("email matches input", result.email, body.email);
  // 9. Validate account status field
  TestValidator.predicate(
    "status exists",
    result.status !== undefined && result.status.length > 0,
  );
  // 10. Validate ISO 8601 date-time format for created_at
  TestValidator.predicate(
    "created_at is valid ISO format",
    !isNaN(Date.parse(result.created_at)),
  );
  // 11. Validate ISO 8601 date-time format for updated_at
  TestValidator.predicate(
    "updated_at is valid ISO format",
    !isNaN(Date.parse(result.updated_at)),
  );
  // 12. Validate soft-delete field
  TestValidator.predicate(
    "deleted_at is null or valid date",
    result.deleted_at === null || !isNaN(Date.parse(result.deleted_at)),
  );
}
