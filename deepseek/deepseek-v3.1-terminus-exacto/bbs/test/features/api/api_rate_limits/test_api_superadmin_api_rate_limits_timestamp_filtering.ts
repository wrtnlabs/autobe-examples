import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test timestamp-based filtering capabilities for API rate limits.
 * Verify that filtering by created_at_after and updated_at_after parameters
 * works correctly with ISO 8601 date-time formats.
 */
export async function test_api_superadmin_api_rate_limits_timestamp_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Get current timestamp for filtering
  const currentTime = new Date().toISOString();
  const pastTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  // Test 1: Filter by created_at_after with past timestamp
  const createdAfterResult =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          created_at_after: pastTime,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(createdAfterResult);
  // Test 2: Filter by updated_at_after with past timestamp
  const updatedAfterResult =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          updated_at_after: pastTime,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(updatedAfterResult);
  // Test 3: Combine timestamp filters with other criteria
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          created_at_after: pastTime,
          updated_at_after: pastTime,
          is_active: true,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test 4: Test with specific HTTP method filter combined with timestamp
  const methodFilterResult =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          http_method: "GET",
          created_at_after: pastTime,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(methodFilterResult);
  // Test 5: Test pagination with timestamp filtering
  const paginatedResult =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.index(
      superAdminConnection,
      {
        body: {
          created_at_after: pastTime,
          limit: 3,
          page: 1,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(paginatedResult);
}
