import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_reports_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication with actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Generate valid post UUID for testing
  // Note: We cannot create posts/reports through available SDK functions,
  // so we test with a valid UUID format that the API will process
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch reports for the post using admin-specific connection
  const response =
    await api.functional.redditCommunity.admin.posts.reports.index(
      adminConnection,
      {
        postId,
        body: {} satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure using typia.assert (handles all field validation)
  typia.assert(response);
  // 5. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is at least 1",
    response.pagination.current,
    response.pagination.current >= 1 ? response.pagination.current : 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Validate pagination consistency
  if (response.pagination.records > 0) {
    TestValidator.equals(
      "pagination pages matches records and limit",
      response.pagination.pages,
      Math.ceil(response.pagination.records / response.pagination.limit),
    );
  }
  // 7. Validate report ordering: status_id ASC, then created_at DESC
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevReport = response.data[i - 1];
      const currReport = response.data[i];
      // If statuses are different, previous must have lower status_id (pending first)
      if (prevReport.status_id !== currReport.status_id) {
        const prevStatus = parseInt(prevReport.status_id.split("-")[0] ?? "0");
        const currStatus = parseInt(currReport.status_id.split("-")[0] ?? "0");
        TestValidator.predicate(
          `report ${i - 1} should have lower status than report ${i}`,
          prevStatus <= currStatus,
        );
      } else if (prevReport.status_id === currReport.status_id) {
        // Same status: previous should have later created_at (newest first)
        TestValidator.predicate(
          `report ${i - 1} should be newer than report ${i} for same status`,
          new Date(prevReport.created_at) >= new Date(currReport.created_at),
        );
      }
    }
  }
  // 8. Validate each report contains required fields through typia.assert
  // (typia.assert already validates all fields exist and are correct type)
  for (const report of response.data) {
    // Reporter identity validation
    typia.assert(report.reporter);
    TestValidator.equals(
      "reporter has id",
      report.reporter.id !== undefined,
      true,
    );
    TestValidator.equals(
      "reporter has username",
      report.reporter.username !== undefined,
      true,
    );
    TestValidator.equals(
      "reporter has created_at",
      report.reporter.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "reporter has updated_at",
      report.reporter.updated_at !== undefined,
      true,
    );
    // Community context validation
    typia.assert(report.community);
    TestValidator.equals(
      "community has id",
      report.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      report.community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community has created_at",
      report.community.created_at !== undefined,
      true,
    );
    // Target post validation (can be null for comment-only reports)
    if (report.targetPost !== null) {
      typia.assert(report.targetPost);
      TestValidator.equals(
        "targetPost has id",
        report.targetPost.id !== undefined,
        true,
      );
      TestValidator.equals(
        "targetPost has title",
        report.targetPost.title !== undefined,
        true,
      );
    }
    // Report core fields validation
    TestValidator.equals("report has id", report.id !== undefined, true);
    TestValidator.equals(
      "report has reason",
      report.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "report has status_id",
      report.status_id !== undefined,
      true,
    );
    TestValidator.equals(
      "report has created_at",
      report.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "report has updated_at",
      report.updated_at !== undefined,
      true,
    );
    TestValidator.equals(
      "report has deleted_at",
      report.deleted_at !== undefined,
      true,
    );
  }
  // 9. Validate timestamps are valid ISO 8601 format
  if (response.data.length > 0) {
    const firstReport = response.data[0];
    TestValidator.predicate("report created_at is valid date-time", () => {
      const date = new Date(firstReport.created_at);
      return !isNaN(date.getTime());
    });
    TestValidator.predicate("report updated_at is valid date-time", () => {
      const date = new Date(firstReport.updated_at);
      return !isNaN(date.getTime());
    });
    TestValidator.predicate("reporter created_at is valid date-time", () => {
      const date = new Date(firstReport.reporter.created_at);
      return !isNaN(date.getTime());
    });
    TestValidator.predicate("community created_at is valid date-time", () => {
      const date = new Date(firstReport.community.created_at);
      return !isNaN(date.getTime());
    });
  }
}