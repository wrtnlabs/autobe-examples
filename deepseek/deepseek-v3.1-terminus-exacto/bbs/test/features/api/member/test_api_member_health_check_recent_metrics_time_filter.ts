import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that health endpoint properly filters metrics to include only recent data (last 15 minutes) as specified.
 * As an authenticated member, request the health endpoint and validate that the returned metric has a collection
 * timestamp within the last 15 minutes. Verify that the health check uses recent data for system status assessment.
 */
export async function test_api_member_health_check_recent_metrics_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Call health endpoint
  const healthMetric =
    await api.functional.discussionBoard.member.health.at(memberConnection);
  typia.assert(healthMetric);
  // Validate timestamp is within last 15 minutes (core requirement)
  const collectionTimestamp = new Date(healthMetric.collection_timestamp);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  TestValidator.predicate(
    "collection timestamp should be within last 15 minutes",
    collectionTimestamp >= fifteenMinutesAgo,
  );
  // Additional validation to ensure metric represents recent system status
  TestValidator.predicate(
    "metric should represent current system health",
    healthMetric.status === "healthy" ||
      healthMetric.status === "warning" ||
      healthMetric.status === "critical",
  );
  TestValidator.predicate(
    "metric should have valid numeric value",
    !isNaN(healthMetric.metric_value) && isFinite(healthMetric.metric_value),
  );
}
