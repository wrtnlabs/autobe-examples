import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metrics_with_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Retrieve performance metric with configuration reference
  const metric =
    await api.functional.discussionBoard.superAdmin.performance_metrics.at(
      superAdminConnection,
      {
        metricId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(metric);
  // Validate performance metric contains expected data
  TestValidator.predicate(
    "metric has defined type",
    () => metric.metric_type.length > 0,
  );
  TestValidator.predicate(
    "metric has defined unit",
    () => metric.metric_unit.length > 0,
  );
  TestValidator.predicate(
    "metric has source component",
    () => metric.source_component.length > 0,
  );
  TestValidator.predicate(
    "metric has valid timestamp",
    () => !isNaN(new Date(metric.collection_timestamp).getTime()),
  );
  TestValidator.predicate(
    "metric has time range",
    () => metric.time_range.length > 0,
  );
  // Validate system configuration field structure when present
  if (metric.systemConfiguration !== null) {
    const config = metric.systemConfiguration;
    TestValidator.predicate(
      "system configuration has config_key",
      () => config.config_key.length > 0,
    );
    TestValidator.predicate(
      "system configuration has data_type",
      () => config.data_type.length > 0,
    );
    TestValidator.predicate(
      "system configuration has category",
      () => config.category.length > 0,
    );
    TestValidator.predicate(
      "system configuration has boolean is_sensitive",
      () => typeof config.is_sensitive === "boolean",
    );
    // Test specific business logic: configuration references should be meaningful
    TestValidator.predicate(
      "system configuration fields are not empty strings",
      () =>
        config.config_key.trim() !== "" &&
        config.data_type.trim() !== "" &&
        config.category.trim() !== "",
    );
  }
  // Test business logic: Performance metrics should have reasonable values
  TestValidator.predicate(
    "metric value is non-negative",
    () => metric.metric_value >= 0,
  );
  TestValidator.predicate(
    "metric has valid creation timestamp",
    () => new Date(metric.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "metric has valid update timestamp",
    () => new Date(metric.updated_at) <= new Date(),
  );
  TestValidator.predicate(
    "update timestamp is not before creation",
    () => new Date(metric.updated_at) >= new Date(metric.created_at),
  );
}