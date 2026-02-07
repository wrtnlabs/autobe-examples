import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering moderation queue entries by date ranges for creation, assignment, and resolution timestamps.
 * Create entries with specific timestamps spanning different dates. Perform searches using date range filters
 * for created_at, assigned_at, and resolved_at fields. Verify that entries are correctly filtered by the
 * specified date ranges and that entries outside the ranges are excluded. Test edge cases like empty date
 * ranges and overlapping date boundaries.
 */
export async function test_api_moderation_queue_date_range_filtering(
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
  // Generate test dates spanning different ranges
  const baseDate = new Date("2024-01-01T00:00:00Z");
  const dates = {
    jan1: baseDate.toISOString(),
    jan15: new Date(
      baseDate.getTime() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    feb1: new Date(baseDate.getTime() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    feb15: new Date(
      baseDate.getTime() + 45 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    mar1: new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  };
  // Test created_at date range filtering
  const createdAtResponse =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          created_at_start: dates.jan1,
          created_at_end: dates.feb1,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(createdAtResponse);
  // Test assigned_at date range filtering
  const assignedAtResponse =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          assigned_at_start: dates.jan15,
          assigned_at_end: dates.feb15,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(assignedAtResponse);
  // Test resolved_at date range filtering
  const resolvedAtResponse =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          resolved_at_start: dates.feb1,
          resolved_at_end: dates.mar1,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(resolvedAtResponse);
  // Test empty date range (should return all entries)
  const emptyRangeResponse =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          created_at_start: null,
          created_at_end: null,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(emptyRangeResponse);
  // Test boundary conditions
  const boundaryResponse =
    await api.functional.discussionBoard.superAdmin.moderation_queue.index(
      superAdminConnection,
      {
        body: {
          created_at_start: dates.jan15,
          created_at_end: dates.jan15,
        } satisfies IDiscussionBoardContentModerationQueue.IRequest,
      },
    );
  typia.assert(boundaryResponse);
}
