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

export async function test_api_admin_account_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  const result = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(result);
  // 2. Validate response structure
  TestValidator.equals(
    "admin ID is UUID",
    result.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals("email matches input", result.email, joinInput.email);
  TestValidator.equals("status is active", result.status, "active");
  TestValidator.equals("deleted_at is null", result.deleted_at, null);
  TestValidator.predicate(
    "created_at is set",
    result.created_at !== undefined && result.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    result.updated_at !== undefined && result.updated_at !== null,
  );
  // 3. Validate token structure
  TestValidator.equals(
    "access token exists",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "expired_at is valid",
    result.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    result.token.refreshable_until !== undefined,
  );
  typia.assert(result.token);
}
