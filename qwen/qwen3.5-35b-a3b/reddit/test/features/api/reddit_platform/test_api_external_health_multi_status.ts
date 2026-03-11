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

export async function test_api_external_health_multi_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform to obtain initial credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(16);
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create authenticated connection with admin token for health endpoint
  const healthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Retrieve external health status
  const healthData =
    await api.functional.redditPlatform.admin.health.external(healthConnection);
  typia.assert(healthData);
  // 4. Validate services array exists and contains items
  TestValidator.equals(
    "services array exists and is not empty",
    healthData.services.length > 0,
    true,
  );
  // 5. Validate at least one of each service status type exists
  const availableServices = healthData.services.filter(
    (s) => s.status === "available",
  );
  const degradedServices = healthData.services.filter(
    (s) => s.status === "degraded",
  );
  const unavailableServices = healthData.services.filter(
    (s) => s.status === "unavailable",
  );
  const maintenanceServices = healthData.services.filter(
    (s) => s.status === "maintenance",
  );
  TestValidator.equals(
    "at least one available service",
    availableServices.length > 0,
    true,
  );
  TestValidator.equals(
    "at least one degraded service",
    degradedServices.length > 0,
    true,
  );
  TestValidator.equals(
    "at least one unavailable service",
    unavailableServices.length > 0,
    true,
  );
  TestValidator.equals(
    "at least one maintenance service",
    maintenanceServices.length > 0,
    true,
  );
  // 6. Validate available services have empty alerts array
  for (const service of availableServices) {
    TestValidator.equals(
      "available service has empty alerts array",
      service.alerts.length,
      0,
    );
  }
  // 7. Validate degraded services have populated alerts arrays
  for (const service of degradedServices) {
    TestValidator.predicate(
      "degraded service has non-empty alerts array",
      service.alerts.length > 0,
    );
  }
  // 8. Validate unavailable services have populated alerts arrays
  for (const service of unavailableServices) {
    TestValidator.predicate(
      "unavailable service has non-empty alerts array",
      service.alerts.length > 0,
    );
  }
  // 9. Validate maintenance services have empty alerts array
  for (const service of maintenanceServices) {
    TestValidator.equals(
      "maintenance service has empty alerts array",
      service.alerts.length,
      0,
    );
  }
  // 10. Validate averageResponseTime is non-negative for all services
  for (const service of healthData.services) {
    TestValidator.predicate(
      "service has valid average response time",
      service.averageResponseTime >= 0,
    );
  }
  // 11. Validate lastCheckedAt is a valid date-time for all services
  for (const service of healthData.services) {
    TestValidator.predicate(
      "lastCheckedAt is valid date-time",
      !isNaN(Date.parse(service.lastCheckedAt)),
    );
  }
  // 12. Verify all required fields exist for each service
  for (const service of healthData.services) {
    TestValidator.equals(
      "service has name field",
      typeof service.name,
      "string",
    );
    TestValidator.equals(
      "service has status field",
      typeof service.status,
      "string",
    );
    TestValidator.equals(
      "service has averageResponseTime field",
      typeof service.averageResponseTime,
      "number",
    );
    TestValidator.equals(
      "service has lastCheckedAt field",
      typeof service.lastCheckedAt,
      "string",
    );
    TestValidator.equals(
      "service has alerts field as array",
      Array.isArray(service.alerts),
      true,
    );
  }
  // 13. Validate status is one of the allowed values for each service
  for (const service of healthData.services) {
    const allowedStatuses = [
      "available",
      "degraded",
      "unavailable",
      "maintenance",
    ];
    TestValidator.predicate(
      "service status is valid",
      allowedStatuses.includes(service.status),
    );
  }
}
