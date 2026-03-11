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

export async function test_api_member_health_check_system_overall_status(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Call health endpoint
  const healthMetric =
    await api.functional.discussionBoard.member.health.at(memberConnection);
  typia.assert(healthMetric);
  // Validate all required fields exist
  TestValidator.equals("has id", typeof healthMetric.id, "string");
  TestValidator.equals(
    "has metric_type",
    typeof healthMetric.metric_type,
    "string",
  );
  TestValidator.equals(
    "has metric_value",
    typeof healthMetric.metric_value,
    "number",
  );
  TestValidator.equals("has unit", typeof healthMetric.unit, "string");
  TestValidator.equals(
    "has source_service",
    typeof healthMetric.source_service,
    "string",
  );
  TestValidator.equals(
    "has collection_timestamp",
    typeof healthMetric.collection_timestamp,
    "string",
  );
  TestValidator.equals("has status", typeof healthMetric.status, "string");
  // Validate status is one of allowed values
  TestValidator.predicate(
    "status is valid",
    healthMetric.status === "healthy" ||
      healthMetric.status === "warning" ||
      healthMetric.status === "critical",
  );
  // Validate timestamp format
  TestValidator.predicate(
    "collection_timestamp is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      healthMetric.collection_timestamp,
    ),
  );
  // Validate metric_value is a number (not NaN or Infinity)
  TestValidator.predicate(
    "metric_value is finite number",
    Number.isFinite(healthMetric.metric_value),
  );
}
