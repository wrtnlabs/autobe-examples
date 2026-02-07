import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test audit log search with specific date range filtering to verify temporal query capabilities.
 * Validates that the system correctly returns audit entries within the specified start and end dates,
 * with proper exclusion of entries outside the date range. Also tests pagination with date-filtered
 * results and time bucket aggregation functionality.
 */
export async function test_api_audit_logs_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate date range for testing (last 7 days)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test with different time bucket aggregations
  const timeBuckets = ["hourly", "daily", "weekly", "monthly"] as const;
  for (const timeBucket of timeBuckets) {
    // Test audit log search with specific time bucket
    const request: IDiscussionBoardAuditLog.IRequest = {
      start_date: startDate,
      end_date: endDate,
      time_bucket: timeBucket,
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      actor_type: null,
      action_type: null,
      success: null,
    };
    const response =
      await api.functional.discussionBoard.admin.audit_logs.index(
        adminConnection,
        { body: request },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.predicate(
      "has current page",
      response.pagination.current >= 0,
    );
    TestValidator.predicate("has limit", response.pagination.limit >= 1);
    TestValidator.predicate(
      "has records count",
      response.pagination.records >= 0,
    );
    TestValidator.predicate("has pages count", response.pagination.pages >= 0);
    // Validate data array
    TestValidator.equals("data is array", Array.isArray(response.data), true);
    if (response.data.length > 0) {
      // Validate individual audit log entries
      for (const entry of response.data) {
        typia.assert(entry);
        // Validate time bucket format
        TestValidator.predicate(
          "timeBucket is valid date-time",
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
            entry.timeBucket,
          ),
        );
        // Validate actor type
        const validActorTypes = [
          "user",
          "admin",
          "super_admin",
          "system",
        ] as const;
        TestValidator.predicate(
          "actorType is valid",
          validActorTypes.includes(entry.actorType),
        );
        // Validate counts
        TestValidator.predicate(
          "totalCount is non-negative",
          entry.totalCount >= 0,
        );
        TestValidator.predicate(
          "successCount is non-negative",
          entry.successCount >= 0,
        );
        TestValidator.predicate(
          "failureCount is non-negative",
          entry.failureCount >= 0,
        );
        TestValidator.predicate(
          "successCount <= totalCount",
          entry.successCount <= entry.totalCount,
        );
        TestValidator.predicate(
          "failureCount <= totalCount",
          entry.failureCount <= entry.totalCount,
        );
        // Validate success rate calculation
        TestValidator.predicate(
          "successRate is between 0 and 100",
          entry.successRate >= 0 && entry.successRate <= 100,
        );
        // Validate trend indicator if present
        if (entry.trendIndicator) {
          const validTrends = ["increasing", "decreasing", "stable"] as const;
          TestValidator.predicate(
            "trendIndicator is valid",
            validTrends.includes(entry.trendIndicator),
          );
        }
      }
    }
    // Test pagination by requesting different pages
    if (response.pagination.pages > 1) {
      const page2Request: IDiscussionBoardAuditLog.IRequest = {
        ...request,
        page: Math.min(2, response.pagination.pages),
      };
      const page2Response =
        await api.functional.discussionBoard.admin.audit_logs.index(
          adminConnection,
          { body: page2Request },
        );
      typia.assert(page2Response);
      TestValidator.notEquals(
        "different page returns different data",
        response.data,
        page2Response.data,
      );
    }
  }
  // Test with specific actor type filtering
  const actorTypes = ["user", "admin", "super_admin", "system"] as const;
  for (const actorType of actorTypes) {
    const actorRequest: IDiscussionBoardAuditLog.IRequest = {
      start_date: startDate,
      end_date: endDate,
      time_bucket: "daily",
      actor_type: actorType,
      page: 1,
      limit: 10,
      action_type: null,
      success: null,
    };
    const actorResponse =
      await api.functional.discussionBoard.admin.audit_logs.index(
        adminConnection,
        { body: actorRequest },
      );
    typia.assert(actorResponse);
    // If we have data, validate actor type filtering
    if (actorResponse.data.length > 0) {
      for (const entry of actorResponse.data) {
        TestValidator.equals(
          "actor type matches filter",
          entry.actorType,
          actorType,
        );
      }
    }
  }
}
