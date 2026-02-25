import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleViewStatEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStatEvent";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive system statistics retrieval for super administrators.
 *
 * This test verifies that super administrators can access platform-wide statistics
 * including article view metrics, engagement data, and performance indicators.
 * The test authenticates a super admin user and validates the statistics response
 * structure and data integrity.
 */
export async function test_api_super_admin_statistics_comprehensive_overview(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "super_admin_password_123",
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  // Retrieve comprehensive statistics
  const statistics =
    await api.functional.discussionBoard.superAdmin.statistics.at(
      superAdminConnection,
    );
  typia.assert(statistics);
  // Validate statistical data integrity
  // Total view count should be non-negative
  if (statistics.total_view_count !== null) {
    TestValidator.predicate(
      "total view count non-negative",
      statistics.total_view_count >= 0,
    );
  }
  // Unique viewer count should be non-negative
  if (statistics.unique_viewer_count !== null) {
    TestValidator.predicate(
      "unique viewer count non-negative",
      statistics.unique_viewer_count >= 0,
    );
  }
  // Average time spent should be non-negative if present
  if (statistics.average_time_spent_seconds !== null) {
    TestValidator.predicate(
      "average time spent non-negative",
      statistics.average_time_spent_seconds >= 0,
    );
  }
  // Total time spent should be non-negative
  TestValidator.predicate(
    "total time spent non-negative",
    statistics.total_time_spent_seconds >= 0,
  );
  // If total view count > 0, unique viewers should be <= total views
  if (
    statistics.total_view_count > 0 &&
    statistics.unique_viewer_count !== null
  ) {
    TestValidator.predicate(
      "unique viewers <= total views",
      statistics.unique_viewer_count <= statistics.total_view_count,
    );
  }
  // Validate timestamp formats
  if (
    statistics.last_viewed_at !== null &&
    statistics.last_viewed_at !== undefined
  ) {
    TestValidator.predicate(
      "last viewed at valid timestamp",
      !isNaN(new Date(statistics.last_viewed_at).getTime()),
    );
  }
  TestValidator.predicate(
    "created at valid timestamp",
    !isNaN(new Date(statistics.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at valid timestamp",
    !isNaN(new Date(statistics.updated_at).getTime()),
  );
  // Validate UUID format for ID
  TestValidator.predicate(
    "valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      statistics.id,
    ),
  );
}
