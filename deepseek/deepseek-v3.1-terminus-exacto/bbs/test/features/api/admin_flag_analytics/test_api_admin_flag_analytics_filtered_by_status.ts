import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_flag_analytics_filtered_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Use the provided authorize_admin_join utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test filtering by each status individually
  const statuses = [
    "pending",
    "under investigation",
    "resolved",
    "dismissed",
  ] as const;
  for (const status of statuses) {
    // Test analytics with specific status filter
    const analytics =
      await api.functional.discussionBoard.admin.analytics.flags.index(
        adminConnection,
        {
          body: {
            status: status,
            limit: 10,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(analytics);
    // Validate that all returned flags have the requested status
    if (analytics.data.length > 0) {
      const allMatchStatus = analytics.data.every(
        (flag) => flag.status === status,
      );
      if (!allMatchStatus) {
        throw new Error(`Not all flags have status ${status}`);
      }
    }
    // Validate pagination structure
    if (typeof analytics.pagination !== "object") {
      throw new Error("Pagination should be an object");
    }
    if (analytics.pagination.current < 0) {
      throw new Error("Current page should be >= 0");
    }
    if (analytics.pagination.limit <= 0) {
      throw new Error("Limit should be > 0");
    }
    if (analytics.pagination.records < 0) {
      throw new Error("Records should be >= 0");
    }
    if (analytics.pagination.pages < 0) {
      throw new Error("Pages should be >= 0");
    }
  }
  // Test edge case: null status (should return all flags)
  const allFlagsAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          status: null,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(allFlagsAnalytics);
  // Test edge case: undefined status (should behave like null)
  const undefinedStatusAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(undefinedStatusAnalytics);
  // Test combination filtering with status and other parameters
  const combinedFilterAnalytics =
    await api.functional.discussionBoard.admin.analytics.flags.index(
      adminConnection,
      {
        body: {
          status: "pending",
          flag_reason: "test reason",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedFilterAnalytics);
}
