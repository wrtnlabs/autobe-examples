import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_post_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Reporter registration and login
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterMember = await api.functional.redditPlatform.auth.member.join(
    reporterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(reporterMember);
  // Update connection with reporter's token
  reporterConnection.headers = { Authorization: reporterMember.token.access };
  // 2. Author (post creator) registration and login
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await api.functional.redditPlatform.auth.member.join(
    authorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(authorMember);
  // Update connection with author's token
  authorConnection.headers = { Authorization: authorMember.token.access };
  // 3. Author creates a post
  const post = await api.functional.redditPlatform.member.posts.create(
    authorConnection,
    {
      body: {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Reporter creates a report for the post
  const report =
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      reporterConnection,
      {
        body: {
          reported_type: "POST" as const,
          reported_id: post.id,
          reason: "Inappropriate content violation",
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(report);
  // 5. Validate report properties
  TestValidator.equals(
    "reporter matches",
    report.reporterId,
    reporterMember.id,
  );
  TestValidator.equals("reported type is POST", report.reportedType, "POST");
  TestValidator.equals("reported id matches post", report.reportedId, post.id);
  TestValidator.equals(
    "reason matches",
    report.reason,
    "Inappropriate content violation",
  );
  TestValidator.equals("status is PENDING", report.status, "PENDING");
  TestValidator.equals(
    "reporter summary username",
    report.reporter.username,
    reporterMember.username,
  );
}
