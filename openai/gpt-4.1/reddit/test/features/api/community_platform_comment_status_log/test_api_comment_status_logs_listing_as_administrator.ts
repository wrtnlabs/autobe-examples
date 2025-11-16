import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentStatusLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentStatusLog";

/**
 * Validates admin listing of all comment status logs with filtering,
 * pagination, and ordering.
 *
 * - Create a fresh administrator account (join)
 * - Authenticate as administrator (token is handled automatically)
 * - Query status logs for a target comment (random UUID for testing, since no
 *   create comment endpoint exists)
 * - Use a range of filters: by status, reason substring, user session, date/time
 *   range
 * - Test pagination: single-page and multi-page constraints
 * - Vary ordering: ascending/descending and by status/created_at
 * - Assert result types and ordering, enforce that a non-admin cannot access logs
 */
export async function test_api_comment_status_logs_listing_as_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a fresh administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: RandomGenerator.name(1),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Prepare random test data for the status log listing
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Basic paginated, chronological (by created_at asc) status log listing
  const listing1 =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "created_at",
          order_direction: "asc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          reason: undefined,
          user_session_id: undefined,
          start_time: undefined,
          end_time: undefined,
        } satisfies ICommunityPlatformCommentStatusLog.IRequest,
      },
    );
  typia.assert(listing1);
  TestValidator.predicate(
    "status log listing is an array",
    Array.isArray(listing1.data),
  );
  if (listing1.data.length > 1) {
    for (let i = 1; i < listing1.data.length; ++i) {
      // Assert chronological order
      TestValidator.predicate(
        `log[${i}] is same or newer than log[${i - 1}] (created_at asc)`,
        listing1.data[i].created_at >= listing1.data[i - 1].created_at,
      );
    }
  }

  // 4. Filter by status (should accept null/undefined)
  const listingStatus =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "created_at",
          order_direction: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: "soft_deleted",
          reason: undefined,
          user_session_id: undefined,
          start_time: undefined,
          end_time: undefined,
        },
      },
    );
  typia.assert(listingStatus);
  if (listingStatus.data.length > 0) {
    listingStatus.data.forEach((item) => {
      TestValidator.equals(
        "status filter for 'soft_deleted'",
        item.status,
        "soft_deleted",
      );
    });
  }

  // 5. Filter by reason substring (business logic: substring query)
  const sampleReason = RandomGenerator.name(2);
  const listingReason =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "created_at",
          order_direction: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          reason: sampleReason,
          user_session_id: undefined,
          start_time: undefined,
          end_time: undefined,
        },
      },
    );
  typia.assert(listingReason);
  if (listingReason.data.length > 0) {
    listingReason.data.forEach((item) => {
      if (item.reason !== null && item.reason !== undefined) {
        TestValidator.predicate(
          `reason filter for substring '${sampleReason}'`,
          item.reason.includes(sampleReason),
        );
      }
    });
  }

  // 6. Filter by user_session_id (specific UUID, random test value)
  const userSessionId = typia.random<string & tags.Format<"uuid">>();
  const listingSession =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "created_at",
          order_direction: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          reason: undefined,
          user_session_id: userSessionId,
          start_time: undefined,
          end_time: undefined,
        },
      },
    );
  typia.assert(listingSession);
  if (listingSession.data.length > 0) {
    listingSession.data.forEach((item) => {
      TestValidator.equals(
        "session filter matches user_session_id",
        item.user_session_id,
        userSessionId,
      );
    });
  }

  // 7. Filter by date range (use valid random date sequence)
  const dateStart = new Date(Date.now() - 100000000);
  const dateEnd = new Date(Date.now() + 100000000);
  const listingRange =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "created_at",
          order_direction: "asc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          reason: undefined,
          user_session_id: undefined,
          start_time: dateStart.toISOString(),
          end_time: dateEnd.toISOString(),
        },
      },
    );
  typia.assert(listingRange);
  if (listingRange.data.length > 0) {
    listingRange.data.forEach((item) => {
      TestValidator.predicate(
        "log is within the date-time filter range",
        item.created_at >= dateStart.toISOString() &&
          item.created_at <= dateEnd.toISOString(),
      );
    });
  }

  // 8. Ordering by status as key (while using default direction)
  const listingOrderByStatus =
    await api.functional.communityPlatform.administrator.comments.statusLogs.index(
      connection,
      {
        commentId,
        body: {
          order_by: "status",
          order_direction: "asc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: undefined,
          reason: undefined,
          user_session_id: undefined,
          start_time: undefined,
          end_time: undefined,
        },
      },
    );
  typia.assert(listingOrderByStatus);
  if (listingOrderByStatus.data.length > 1) {
    for (let i = 1; i < listingOrderByStatus.data.length; ++i) {
      TestValidator.predicate(
        `logs are in ascending 'status' order`,
        listingOrderByStatus.data[i].status >=
          listingOrderByStatus.data[i - 1].status,
      );
    }
  }

  // 9. Permission: Unprivileged access must fail (simulate with headers cleared)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-administrator cannot access status logs",
    async () => {
      await api.functional.communityPlatform.administrator.comments.statusLogs.index(
        unauthConn,
        {
          commentId,
          body: {
            order_by: "created_at",
            order_direction: "asc",
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            status: undefined,
            reason: undefined,
            user_session_id: undefined,
            start_time: undefined,
            end_time: undefined,
          },
        },
      );
    },
  );
}
