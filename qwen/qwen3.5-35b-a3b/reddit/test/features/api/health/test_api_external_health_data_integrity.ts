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

export async function test_api_external_health_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>() ?? null,
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve external health data
  const healthData =
    await api.functional.redditPlatform.admin.health.external(adminConnection);
  typia.assert(healthData);
  // 3. Validate each service entry
  for (const service of healthData.services) {
    // Validate timestamp freshness (within last 5 minutes)
    const now = new Date();
    const lastChecked = new Date(service.lastCheckedAt);
    const timeDifference = now.getTime() - lastChecked.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    TestValidator.predicate(
      "timestamp within acceptable range",
      timeDifference >= 0 && timeDifference <= fiveMinutes,
    );
    // Validate response time is positive
    TestValidator.predicate(
      "response time is positive",
      service.averageResponseTime > 0,
    );
    // Validate status enum value
    const validStatuses: Array<
      "available" | "degraded" | "unavailable" | "maintenance"
    > = ["available", "degraded", "unavailable", "maintenance"];
    TestValidator.predicate(
      "status is valid enum",
      validStatuses.includes(service.status),
    );
    // Validate alerts based on status
    if (service.status === "available" || service.status === "maintenance") {
      TestValidator.equals(
        "alerts empty for healthy status",
        service.alerts.length,
        0,
      );
    } else if (
      service.status === "degraded" ||
      service.status === "unavailable"
    ) {
      TestValidator.predicate(
        "alerts populated for unhealthy status",
        service.alerts.length > 0,
      );
    }
  }
}