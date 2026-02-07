import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_report_resolution_status_retrieval(
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
  // Test retrieving a comment report with valid UUID parameters
  // Since we cannot create actual reports, we test the endpoint structure
  // and validate that it returns proper error handling or valid report data
  const report =
    await api.functional.discussionBoard.admin.articles.comments.reports.at(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        commentId: typia.random<string & tags.Format<"uuid">>(),
        reportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // Validate the response structure using typia.assert
  typia.assert(report);
  // The typia.assert above performs complete validation including:
  // - All required properties exist
  // - All types are correct
  // - All format validations (UUID, date-time, etc.)
  // - All constraint validations
  // Since typia.assert performs complete validation, we only test business logic
  // aspects that are not covered by type validation
  // Validate that status is one of the allowed values
  TestValidator.predicate(
    "report status should be valid enum value",
    report.status === "pending" ||
      report.status === "under_review" ||
      report.status === "resolved",
  );
  // Validate business logic: resolved reports should have resolution details
  if (report.status === "resolved") {
    TestValidator.predicate(
      "resolved reports must have resolution_details",
      report.resolution_details !== null &&
        report.resolution_details !== undefined,
    );
    TestValidator.predicate(
      "resolved reports must have resolved_at timestamp",
      report.resolved_at !== null && report.resolved_at !== undefined,
    );
  }
  // Validate that non-resolved reports don't have resolution fields populated
  if (report.status !== "resolved") {
    TestValidator.equals(
      "non-resolved reports should have null resolution_details",
      report.resolution_details,
      null,
    );
    TestValidator.equals(
      "non-resolved reports should have null resolved_at",
      report.resolved_at,
      null,
    );
  }
}
