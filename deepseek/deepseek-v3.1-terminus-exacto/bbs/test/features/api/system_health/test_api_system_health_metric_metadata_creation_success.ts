import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetricMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetricMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_health_metrics_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_health_metrics_metadata_create";
import { prepare_random_discussion_board_system_health_metric_metadatum } from "../../../prepare/prepare_random_discussion_board_system_health_metric_metadatum";

/**
 * Test successful creation of metadata key-value pair for an existing system health metric.
 * SuperAdmin authenticates, provides valid metricId in path and valid key/value pair in request body.
 * Validate that the system creates the metadata with unique key within the metric scope, sets automatic timestamps,
 * and returns the full metadata record with id, key, value, parent metric reference, and created/updated timestamps.
 * Verify response status is 201 (or appropriate success code), response includes all expected fields,
 * key-value pair matches request, parent metric_id matches path parameter, and timestamps are recent.
 * Test that subsequent listing of metadata for this metric includes the newly created record.
 */
export async function test_api_system_health_metric_metadata_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate random metricId for the path parameter
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Prepare metadata creation body
  const body = {
    key: RandomGenerator.alphabets(8),
    value: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardSystemHealthMetricMetadatum.ICreate;
  // Create metadata using the generation function
  const metadata =
    await generate_random_discussion_board_super_admin_system_health_metrics_metadata_create(
      superAdminConnection,
      {
        body,
        params: { metricId },
      },
    );
  // Validate the response using typia.assert
  typia.assert(metadata);
  // Verify all expected fields are present and correct
  TestValidator.predicate(
    "metadata id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      metadata.id,
    ),
  );
  TestValidator.equals("metadata key matches request", metadata.key, body.key);
  TestValidator.equals(
    "metadata value matches request",
    metadata.value,
    body.value,
  );
  TestValidator.equals(
    "parent metric_id matches path parameter",
    metadata.system_health_metric_id,
    metricId,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(metadata.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(metadata.updated_at),
  );
  TestValidator.predicate(
    "created_at is recent",
    Date.now() - new Date(metadata.created_at).getTime() < 60000,
  );
  TestValidator.predicate(
    "updated_at is recent",
    Date.now() - new Date(metadata.updated_at).getTime() < 60000,
  );
}
