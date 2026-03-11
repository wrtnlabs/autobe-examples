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

export async function test_api_guest_health_metric_completeness_and_format(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection using utility function
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
  // Validate pagination calculation
  TestValidator.equals(
    "pages calculation",
    healthResponse.pagination.pages,
    Math.ceil(
      healthResponse.pagination.records / healthResponse.pagination.limit,
    ),
  );
  // Validate each metric record
  for (const metric of healthResponse.data) {
    typia.assert(metric);
    // Validate metric value ranges based on type
    if (metric.metric_type.includes("response_time")) {
      TestValidator.predicate(
        "response time positive",
        metric.metric_value >= 0,
      );
      TestValidator.predicate(
        "response time reasonable",
        metric.metric_value <= 30000,
      ); // 30 seconds max
    } else if (
      metric.metric_type.includes("success_rate") ||
      metric.metric_type.includes("error_rate")
    ) {
      TestValidator.predicate(
        "rate between 0 and 100",
        metric.metric_value >= 0 && metric.metric_value <= 100,
      );
    }
    // Validate timestamp is recent (within 15 minutes)
    const collectionTime = new Date(metric.collection_timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - collectionTime.getTime();
    TestValidator.predicate("timestamp recent", timeDiff <= 15 * 60 * 1000); // 15 minutes in milliseconds
  }
}
