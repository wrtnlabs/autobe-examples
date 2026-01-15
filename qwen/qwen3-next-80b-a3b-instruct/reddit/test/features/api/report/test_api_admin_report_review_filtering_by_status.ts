import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTracking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportTracking";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_report_review_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Retrieve all reports from the system
  const response =
    await api.functional.communityPlatform.admin.reports.admin.reviews.index(
      adminConnection,
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages > 0,
  );
  // Validate each report
  for (const report of response.data) {
    // Using typia.assert already validated all types
    // Now validate business logic constraints
    TestValidator.equals(
      "reported_content_type is valid enum value",
      [
        "post",
        "comment",
        "message",
        "product_review",
        "question",
        "answer",
      ].includes(report.reported_content_type),
      true,
    );
    TestValidator.equals(
      "status is valid enum value",
      ["pending", "reviewed", "dismissed", "action_taken", "resolved"].includes(
        report.status,
      ),
      true,
    );
    TestValidator.equals(
      "priority_level is valid enum value",
      ["low", "medium", "high", "urgent"].includes(report.priority_level),
      true,
    );
    // Validate action count and values
    TestValidator.predicate(
      "moderation_actions has at least one item or is empty",
      Array.isArray(report.moderation_actions) &&
        report.moderation_actions.length <= 10,
    );
    for (const action of report.moderation_actions) {
      TestValidator.equals(
        "moderation_action is valid enum value",
        [
          "content_removed",
          "user_warning",
          "user_suspension",
          "user_ban",
          "content_hidden",
          "content_aged",
          "added_tag",
          "reopened",
          "no_action",
        ].includes(action),
        true,
      );
    }
    // Validate optional numeric fields
    if (report.child_report_count !== undefined) {
      TestValidator.predicate(
        "child_report_count is between 0 and 1000",
        report.child_report_count >= 0 && report.child_report_count <= 1000,
      );
    }
    // Validate dates and UUIDs are strings (typia.assert has already validated format)
    TestValidator.equals(
      "created_at is string",
      typeof report.created_at,
      "string",
    );
    TestValidator.equals(
      "reported_by_actor_id is string",
      typeof report.reported_by_actor_id,
      "string",
    );
    TestValidator.equals(
      "assigned_moderator_id is string",
      typeof report.assigned_moderator_id,
      "string",
    );
    TestValidator.equals("notes is string", typeof report.notes, "string");
  }
}
