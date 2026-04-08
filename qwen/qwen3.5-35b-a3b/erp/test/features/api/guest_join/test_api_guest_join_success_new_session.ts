import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success_new_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random guest registration data
  const input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformGuest.IJoin;
  // 2. Create actor-specific connection and register guest
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, { body: input });
  typia.assert(output);
  // 3. Validate guest account fields
  TestValidator.equals("guest ID format", output.id, output.id);
  TestValidator.equals(
    "device identifier",
    output.device_identifier,
    output.device_identifier,
  );
  // Input IP is optional, output ip_address must match if input provided
  if (input.ip !== undefined) {
    TestValidator.equals(
      "IP address matches request",
      output.ip_address,
      input.ip,
    );
  }
  TestValidator.notEquals("user agent non-empty", output.user_agent, "");
  TestValidator.equals(
    "created at format",
    output.created_at,
    output.created_at,
  );
  TestValidator.equals(
    "updated at format",
    output.updated_at,
    output.updated_at,
  );
  TestValidator.equals("deleted at is null", output.deleted_at, null);
  TestValidator.equals(
    "organization ID is null for guest",
    output.organization_id,
    null,
  );
  // session_id can be null or UUID, validate if present
  if (output.session_id !== null) {
    TestValidator.equals(
      "session ID format",
      output.session_id,
      output.session_id,
    );
  }
  // 4. Validate token structure (already validated by typia.assert(output))
  TestValidator.equals("access token exists", output.token.access !== "", true);
  TestValidator.equals(
    "refresh token exists",
    output.token.refresh !== "",
    true,
  );
  TestValidator.equals(
    "expired at format",
    output.token.expired_at,
    output.token.expired_at,
  );
  TestValidator.equals(
    "refreshable until format",
    output.token.refreshable_until,
    output.token.refreshable_until,
  );
  // 5. Validate token relationship
  const expiredAt = new Date(output.token.expired_at);
  const refreshableUntil = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "refreshable until >= expired at",
    refreshableUntil >= expiredAt,
  );
  // 6. Verify timestamps are not in the future
  const now = new Date();
  TestValidator.predicate(
    "created at is not future",
    output.created_at ? new Date(output.created_at) <= now : true,
  );
  TestValidator.predicate(
    "updated at is not future",
    output.updated_at ? new Date(output.updated_at) <= now : true,
  );
  TestValidator.predicate(
    "expired at is not past",
    new Date(output.token.expired_at) > now,
  );
}
