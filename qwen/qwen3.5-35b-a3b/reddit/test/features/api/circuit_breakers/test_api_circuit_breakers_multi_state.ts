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

export async function test_api_circuit_breakers_multi_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IRedditPlatformAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Get circuit breakers list
  const response: IPageIRedditPlatformCircuitBreaker.ISummary =
    await api.functional.redditPlatform.admin.circuit_breakers.list(
      adminConnection,
    );
  typia.assert(response);
  // 3. Validate circuit breaker states
  for (const circuitBreaker of response.data) {
    // Validate endpoint_url and state are present (required by ISummary)
    TestValidator.notEquals(
      "endpoint_url is present",
      circuitBreaker.endpoint_url,
      null,
    );
    TestValidator.notEquals("state is present", circuitBreaker.state, null);
    // Validate failure_count and success_count are non-negative
    TestValidator.predicate(
      "failure_count is non-negative",
      circuitBreaker.failure_count >= 0,
    );
    TestValidator.predicate(
      "success_count is non-negative",
      circuitBreaker.success_count >= 0,
    );
    // Validate timestamps are ISO 8601 formatted
    TestValidator.predicate("last_failure_at is valid date-time", () => {
      try {
        const date = new Date(circuitBreaker.last_failure_at);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    });
    TestValidator.predicate("last_state_change_at is valid date-time", () => {
      try {
        const date = new Date(circuitBreaker.last_state_change_at);
        return !isNaN(date.getTime());
      } catch {
        return false;
      }
    });
    // Validate state-specific fields
    switch (circuitBreaker.state) {
      case "closed":
        // CLOSED: normal operation, failure_count < 5, next_test_at = null
        TestValidator.predicate(
          "closed state has failure_count < 5",
          circuitBreaker.failure_count < 5,
        );
        TestValidator.equals(
          "closed state has next_test_at as null",
          circuitBreaker.next_test_at,
          null,
        );
        break;
      case "open":
        // OPEN: tripped, failure_count >= 5, next_test_at = null
        TestValidator.predicate(
          "open state has failure_count >= 5",
          circuitBreaker.failure_count >= 5,
        );
        TestValidator.equals(
          "open state has next_test_at as null",
          circuitBreaker.next_test_at,
          null,
        );
        break;
      case "half-open":
        // HALF-OPEN: test scheduled, next_test_at is future datetime
        TestValidator.notEquals(
          "half-open state has next_test_at not null",
          circuitBreaker.next_test_at,
          null,
        );
        // Validate next_test_at is a valid date-time
        TestValidator.predicate(
          "next_test_at is valid date-time format",
          () => {
            try {
              const date = new Date(circuitBreaker.next_test_at!);
              return !isNaN(date.getTime());
            } catch {
              return false;
            }
          },
        );
        break;
    }
  }
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    response.pagination.pages >= 0,
    true,
  );
}
