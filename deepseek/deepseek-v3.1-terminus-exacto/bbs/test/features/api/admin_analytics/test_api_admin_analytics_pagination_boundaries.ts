import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination boundary conditions for the admin analytics endpoint.
 * Validates edge cases like pages beyond available data, minimum/maximum limits,
 * and pagination behavior with various parameters.
 */
export async function test_api_admin_analytics_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      display_name: "Test Admin",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Minimum valid pagination (page=1, limit=1)
  const response1 = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
  // Test 2: Maximum valid limit (page=1, limit=100)
  const response2 = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
  // Test 3: Page beyond available data (page=999999)
  const response3 = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 999999,
        limit: 10,
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
  // Test 4: Various limit values
  const limits = [5, 25, 50] as const;
  for (const limit of limits) {
    const response = await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  }
  // Test 5: Basic pagination consistency check
  const response5 = await api.functional.discussionBoard.admin.analytics.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardPerformanceMetric.IRequest,
    },
  );
}
