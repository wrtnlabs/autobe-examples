import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCircuitBreaker";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCircuitBreaker";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_circuit_breakers_admin_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create new connection with admin token
  const adminListConnection: api.IConnection = { host: connection.host };
  adminListConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 3. Retrieve circuit breaker list
  const circuitBreakers =
    await api.functional.redditPlatform.admin.circuit_breakers.list(
      adminListConnection,
    );
  typia.assert(circuitBreakers);
  // 4. Validate pagination exists and has valid structure
  TestValidator.predicate(
    "pagination current is non-negative",
    () => circuitBreakers.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    () => circuitBreakers.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => circuitBreakers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => circuitBreakers.pagination.pages >= 0,
  );
  // 5. Validate at least one circuit breaker exists
  TestValidator.predicate(
    "at least one circuit breaker is configured",
    () => circuitBreakers.data.length >= 1,
  );
  // 6. Validate each circuit breaker summary
  for (let i = 0; i < circuitBreakers.data.length; i++) {
    const cb = circuitBreakers.data[i];
    // Validate endpoint_url is valid URI
    typia.assertGuard(cb.endpoint_url);
    // Validate state is one of the allowed values
    TestValidator.predicate(
      `circuit breaker ${i} state is valid`,
      () =>
        cb.state === "closed" ||
        cb.state === "open" ||
        cb.state === "half-open",
    );
    // Validate failure_count is non-negative
    TestValidator.predicate(
      `circuit breaker ${i} failure_count is non-negative`,
      () => cb.failure_count >= 0,
    );
    // Validate success_count is non-negative
    TestValidator.predicate(
      `circuit breaker ${i} success_count is non-negative`,
      () => cb.success_count >= 0,
    );
    // Validate last_failure_at is valid (always present)
    if (cb.last_failure_at !== null) {
      typia.assertGuard(cb.last_failure_at);
    }
    // Validate last_state_change_at is valid (always present)
    typia.assertGuard(cb.last_state_change_at);
    // Validate next_test_at is only set when in half-open state
    if (cb.state === "half-open") {
      TestValidator.predicate(
        `circuit breaker ${i} next_test_at is set when half-open`,
        () => cb.next_test_at !== null && cb.next_test_at !== undefined,
      );
      typia.assertGuard(cb.next_test_at);
    } else {
      TestValidator.predicate(
        `circuit breaker ${i} next_test_at is null when not half-open`,
        () => cb.next_test_at === null || cb.next_test_at === undefined,
      );
    }
  }
}
