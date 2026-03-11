import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHealthExternalService } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthExternalService";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test external health monitoring endpoint for admin users.
 * Validates the health status API that monitors external service integrations.
 */
export async function test_api_external_health_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Retrieve health data using admin connection (headers updated by authorize_admin_join)
  const healthData =
    await api.functional.redditPlatform.admin.health.external(adminConnection);
  typia.assert(healthData);
  // 3. Validate services array structure
  const services = healthData.services;
  TestValidator.predicate("services is array", Array.isArray(services));
  // 4. Validate each service entry structure
  for (const service of services) {
    typia.assert(service);
    // Validate service name exists and is string
    TestValidator.notEquals("service name exists", service.name, null);
    TestValidator.predicate(
      "service name is string",
      typeof service.name === "string",
    );
    // Validate service status is one of the valid values
    const validStatuses = [
      "available",
      "degraded",
      "unavailable",
      "maintenance",
    ] as const;
    const status = service.status satisfies (typeof validStatuses)[number];
    TestValidator.predicate(
      "service status is valid",
      validStatuses.includes(status),
    );
    // Validate average response time is non-negative number
    TestValidator.predicate(
      "average response time is number",
      typeof service.averageResponseTime === "number",
    );
    TestValidator.predicate(
      "average response time is non-negative",
      service.averageResponseTime >= 0,
    );
    // Validate last checked at timestamp format
    TestValidator.predicate(
      "last checked at is valid date-time",
      !isNaN(Date.parse(service.lastCheckedAt)),
    );
    // Validate alerts array
    TestValidator.predicate("alerts is array", Array.isArray(service.alerts));
  }
  // 5. Test scenario: Empty services array or verify service completeness
  if (services.length === 0) {
    TestValidator.predicate(
      "empty services array is valid",
      services.length === 0,
    );
  } else {
    // Verify services have complete data
    TestValidator.predicate(
      "services have complete data",
      services.every(
        (s) =>
          s.name &&
          s.status &&
          typeof s.averageResponseTime === "number" &&
          s.lastCheckedAt &&
          Array.isArray(s.alerts),
      ),
    );
  }
}
