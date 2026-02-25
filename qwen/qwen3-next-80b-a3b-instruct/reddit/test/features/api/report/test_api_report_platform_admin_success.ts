import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_report_platform_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // Update connection with auth token
  adminConnection.headers = { Authorization: admin.token.access };
  // Call the endpoint to retrieve pending reports with pagination
  const response =
    await api.functional.redditCommunity.platformAdmin.admin.reports.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
          sort: "newest",
          timeFilter: "all",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  // Validate response schema matches IPageIRedditCommunityReport.ISummary exactly
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate each report summary in data array
  for (const report of response.data) {
    typia.assert(report);
    // Validate all required fields per IRedditCommunityReport.ISummary
    TestValidator.predicate(
      "report id is UUID",
      typeof report.id === "string" && report.id.length > 0,
    );
    TestValidator.predicate(
      "report reason is string",
      typeof report.reason === "string" && report.reason.length > 0,
    );
    TestValidator.equals("report status is pending", report.status, "pending");
    TestValidator.predicate(
      "report created_at is ISO date-time",
      report.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
    );
    TestValidator.predicate(
      "report updated_at is ISO date-time",
      report.updated_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
    );
    TestValidator.predicate(
      "report reporter_username is string",
      typeof report.reporter_username === "string" &&
        report.reporter_username.length > 0,
    );
    TestValidator.predicate(
      "report resolved_by_username is null or string",
      report.resolved_by_username === null ||
        typeof report.resolved_by_username === "string",
    );
    // Validate either target_post_summary or target_comment_summary is present but not both
    const hasPost =
      report.target_post_summary !== null &&
      report.target_post_summary !== undefined;
    const hasComment =
      report.target_comment_summary !== null &&
      report.target_comment_summary !== undefined;
    TestValidator.equals(
      "report has exactly one target type",
      hasPost !== hasComment,
      true,
    );
    // Validate target_post_summary if present
    if (hasPost) {
      const targetPost = report.target_post_summary; // Type narrowing
      typia.assert(targetPost);
      // Ensure TypeScript knows targetPost is not null/undefined for type safety
      const post = targetPost!;
      TestValidator.predicate(
        "post summary id is UUID",
        typeof post.id === "string" && post.id.length > 0,
      );
      TestValidator.predicate(
        "post summary title is string",
        typeof post.title === "string" && post.title.length > 0,
      );
      TestValidator.predicate(
        "post summary author is summary",
        post.author !== null &&
          typeof post.author === "object",
      );
      TestValidator.predicate(
        "post summary community is summary",
        post.community !== null &&
          typeof post.community === "object",
      );
      TestValidator.predicate(
        "post summary voteScore is number",
        typeof post.voteScore === "number",
      );
      TestValidator.predicate(
        "post summary commentCount is number",
        typeof post.commentCount === "number",
      );
      TestValidator.predicate(
        "post summary createdAt is ISO date-time",
        post.createdAt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
      );
      TestValidator.predicate(
        "post summary updatedAt is ISO date-time",
        post.updatedAt.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
      );
      // Validate author and community summary don't expose userIds
      TestValidator.predicate(
        "post author has no id property",
        !('id' in post.author),
      );
      TestValidator.predicate(
        "post community has no id property",
        !('id' in post.community),
      );
    }
    // Validate target_comment_summary if present
    if (hasComment) {
      const targetComment = report.target_comment_summary; // Type narrowing
      typia.assert(targetComment);
      // Ensure TypeScript knows targetComment is not null/undefined for type safety
      const comment = targetComment!;
      TestValidator.predicate(
        "comment summary id is UUID",
        typeof comment.id === "string" && comment.id.length > 0,
      );
      TestValidator.predicate(
        "comment summary content is string",
        typeof comment.content === "string" && comment.content.length > 0,
      );
      TestValidator.predicate(
        "comment summary vote_score is number",
        typeof comment.vote_score === "number",
      );
      TestValidator.predicate(
        "comment summary created_at is ISO date-time",
        comment.created_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
      );
      TestValidator.predicate(
        "comment summary updated_at is ISO date-time",
        comment.updated_at.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/) !== null,
      );
      TestValidator.predicate(
        "comment summary author is summary",
        comment.author !== null &&
          typeof comment.author === "object",
      );
      // Validate author summary doesn't expose userId
      TestValidator.predicate(
        "comment author has no id property",
        !('id' in comment.author),
      );
    }
  }
}