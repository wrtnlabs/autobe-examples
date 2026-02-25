import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare registration data with valid credentials
  const body = {
    email: "owner@example.com",
    password: "SecurePass123!",
    username: "owner_user_123",
    displayName: "Test Owner",
  } satisfies IRedditCloneOwner.IJoin;
  // 2. Create new connection for registration
  const ownerConnection: api.IConnection = { host: connection.host };
  // 3. Execute owner registration
  const output = await authorize_owner_join(ownerConnection, { body });
  typia.assert(output);
  // 4. Validate registration response structure
  TestValidator.equals("id is valid uuid", output.id.length, 36);
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    new Date(output.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    new Date(output.token.refreshable_until) > new Date(),
  );
  // 5. Verify authentication token can be used for API calls
  // Using the connection that was automatically updated by authorize_owner_join
  TestValidator.predicate(
    "connection has authorization header",
    !!ownerConnection.headers?.["authorization"],
  );
}
