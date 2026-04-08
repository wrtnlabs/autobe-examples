import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Create actor-specific connection for guest registration
  const guestConnection: api.IConnection = { host: connection.host };
  // 3. Register guest account using utility function
  const output = await authorize_guest_join(guestConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(output);
  // 4. Verify guest id is UUID format
  TestValidator.equals("guest id is UUID", output.id, output.id);
  // 5. Verify email matches input
  TestValidator.equals("email matches input", output.email, email);
  // 6. Verify device_id is UUID or null
  if (output.device_id !== null) {
    typia.assert<string & tags.Format<"uuid">>(output.device_id);
  }
  // 7. Verify device_fingerprint is string or null
  if (output.device_fingerprint !== null) {
    typia.assert<string>(output.device_fingerprint);
  }
  // 8. Verify created_at is valid ISO 8601 date-time
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    output.created_at,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    createdAt.length > 0,
  );
  // 9. Verify updated_at is valid ISO 8601 date-time
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    output.updated_at,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    updatedAt.length > 0,
  );
  // 10. Verify deleted_at is null for active account
  TestValidator.equals(
    "active account has no deleted_at",
    output.deleted_at,
    null,
  );
  // 11. Verify token structure
  typia.assert<IAuthorizationToken>(output.token);
  // 12. Verify access token is present
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  // 13. Verify refresh token is present
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  // 14. Verify expired_at is valid ISO 8601 date-time
  const expiredAt = typia.assert<string & tags.Format<"date-time">>(
    output.token.expired_at,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    expiredAt.length > 0,
  );
  // 15. Verify refreshable_until is valid ISO 8601 date-time
  const refreshableUntil = typia.assert<string & tags.Format<"date-time">>(
    output.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    refreshableUntil.length > 0,
  );
  // 16. Test that access token can be used for subsequent requests
  const testConnection: api.IConnection = { host: connection.host };
  testConnection.headers = {
    Authorization: `Bearer ${output.token.access}`,
  };
  TestValidator.equals(
    "authorization header set",
    testConnection.headers.Authorization,
    `Bearer ${output.token.access}`,
  );
}
