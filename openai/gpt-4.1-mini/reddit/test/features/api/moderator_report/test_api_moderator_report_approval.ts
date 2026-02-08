import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comment_reports_create_comment_report } from "../../../generate/generate_random_community_platform_user_comment_reports_create_comment_report";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { generate_random_community_platform_user_post_reports_create } from "../../../generate/generate_random_community_platform_user_post_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";
import { prepare_random_community_platform_post_report } from "../../../prepare/prepare_random_community_platform_post_report";

export async function test_api_moderator_report_approval(
  connection: api.IConnection,
): Promise<void> {
  /**
   * E2E test for moderator report approval endpoint.
   *
   * Scenario 1: Successful report approval by an authenticated moderator.
   * - Setup: Create user and moderator accounts, user creates a post, user reports the post.
   * - Action: Moderator approves the report.
   * - Validation: Report status is 'approved'.
   *
   * Scenario 2: Approving a non-existent report returns 404 error.
   *
   * Scenario 3: Unauthorized user attempts to approve a report and receives 403 error.
   */
  // Create and authenticate user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userAuthorized.token.access },
  };
  // Create and authenticate moderator
  const modJoinConnection: api.IConnection = { host: connection.host };
  const modAuthorized = await authorize_moderator_join(modJoinConnection, {
    body: {},
  });
  typia.assert(modAuthorized);
  const modConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: modAuthorized.token.access },
  };
  // Create a post by the user
  const postRaw = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test post for report approval",
        post_type: "text",
        text: { content: "Sample content" },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Cast post to asserted type with id property
  const post = typia.assert(postRaw) as ICommunityPlatformPost & { id: string };
  // Create a report on the post by the user
  const postReportRaw =
    await generate_random_community_platform_user_post_reports_create(
      userConnection,
      {
        body: {
          post_id: post.id,
        },
      },
    );
  const postReport = typia.assert(postReportRaw) as ICommunityPlatformPostReport & { id: string };
  // Moderator approves the report
  const approvedReportRaw =
    await api.functional.communityPlatform.moderator.reports.approve(
      modConnection,
      {
        reportId: postReport.id,
      },
    );
  // Cast approvedReport to type with status property
  const approvedReport = typia.assert(approvedReportRaw) as ICommunityPlatformReport & {
    status: "approved" | "pending" | "rejected";
  };
  // Validate the report status is 'approved'
  TestValidator.equals(
    "report status approved",
    approvedReport.status,
    "approved",
  );
  // Attempt to approve a non-existent report, expect 404
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "approve non-existent report returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports.approve(
        modConnection,
        {
          reportId: fakeReportId,
        },
      );
    },
  );
  // Unauthorized user attempts to approve the report, expect 403
  await TestValidator.httpError(
    "unauthorized user cannot approve report",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.reports.approve(
        userConnection,
        {
          reportId: postReport.id,
        },
      );
    },
  );
}
