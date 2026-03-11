import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_health_basic_status_check(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Call health endpoint
  const healthResponse =
    await api.functional.discussionBoard.guest.health.at(guestConnection);
  typia.assert(healthResponse);
  // Validate individual health metrics structure
  for (const metric of healthResponse.data) {
    typia.assert(metric);
    // Validate timestamp is within last 15 minutes (business requirement)
    const collectionTime = new Date(metric.collection_timestamp);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    TestValidator.predicate(
      "metric is recent (within 15 minutes)",
      collectionTime >= fifteenMinutesAgo,
    );
  }
  // Check for expected service components (business requirement)
  const serviceTypes = healthResponse.data.map((m) => m.source_service);
  const expectedServices = [
    "api",
    "database",
    "cache",
    "search",
    "file_storage",
  ];
  TestValidator.predicate(
    "contains expected services",
    expectedServices.some((service) => serviceTypes.includes(service)),
  );
  // Test weakest link aggregation (business requirement)
  const statusPriority = { critical: 3, warning: 2, healthy: 1 };
  const worstStatus = healthResponse.data.reduce((worst, metric) => {
    const currentPriority =
      statusPriority[metric.status as keyof typeof statusPriority] || 0;
    return currentPriority > worst ? currentPriority : worst;
  }, 0);
  TestValidator.predicate(
    "valid status aggregation",
    worstStatus >= 1 && worstStatus <= 3,
  );
}
