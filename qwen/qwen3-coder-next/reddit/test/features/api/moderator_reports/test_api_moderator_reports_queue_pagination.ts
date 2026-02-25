import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_member_posts_report_create } from "../../../generate/generate_random_reddit_clone_member_posts_report_create";
import { prepare_random_reddit_clone_content_report } from "../../../prepare/prepare_random_reddit_clone_content_report";

export async function test_api_moderator_reports_queue_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorUsername = RandomGenerator.alphaNumeric(8);
  const moderatorOutput = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorOutput);
  const loginOutput = await api.functional.redditClone.auth.moderator.login(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditCloneModerator.ILogin,
    },
  );
  typia.assert(loginOutput);
  // Create member for submitting reports
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberUsername = RandomGenerator.alphaNumeric(8);
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberOutput);
  // Create multiple posts and reports for pagination testing
  const reportCount = 5;
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple reports on the same post
  await ArrayUtil.asyncRepeat(reportCount, async (i) => {
    await api.functional.redditClone.member.posts.report.create(
      memberConnection,
      {
        postId: postId,
        body: {
          report_type: "post" as const,
          reason: `Report reason ${i + 1}: Inappropriate content ${i + 1}`,
          post_id: postId,
          comment_id: null,
        } satisfies IRedditCloneContentReport.ICreate,
      },
    );
  });
  // Test pagination with limit=2, page=1
  const limit = 2;
  const page = 1;
  const reportsResponse =
    await api.functional.redditClone.moderator.reports.queue.index(
      moderatorConnection,
      {
        body: {
          limit: limit,
          page: page,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  const reportsData = reportsResponse;
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reportsData.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", reportsData.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records should be positive",
    reportsData.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    reportsData.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate(
    "should return reports array",
    Array.isArray(reportsData.data),
  );
  TestValidator.predicate(
    "reports count should not exceed limit",
    reportsData.data.length <= limit,
  );
  // Validate each report structure
  for (const report of reportsData.data) {
    typia.assert(report);
    TestValidator.predicate(
      "report should have id",
      typeof report.id === "string",
    );
    TestValidator.predicate(
      "report should have reporter",
      typeof report.reporter === "object",
    );
    TestValidator.predicate(
      "report should have content",
      typeof report.content === "object",
    );
    TestValidator.equals(
      "report should have pending status",
      report.status,
      "pending",
    );
    TestValidator.predicate(
      "report should have created_at timestamp",
      typeof report.created_at === "string",
    );
  }
  // Test second page
  const page2Response =
    await api.functional.redditClone.moderator.reports.queue.index(
      moderatorConnection,
      {
        body: {
          limit: limit,
          page: 2,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(page2Response);
  // Test with larger limit
  const largeLimit = 10;
  const page3Response =
    await api.functional.redditClone.moderator.reports.queue.index(
      moderatorConnection,
      {
        body: {
          limit: largeLimit,
          page: 1,
        } satisfies IRedditCloneContentReport.IRequest,
      },
    );
  typia.assert(page3Response);
}
