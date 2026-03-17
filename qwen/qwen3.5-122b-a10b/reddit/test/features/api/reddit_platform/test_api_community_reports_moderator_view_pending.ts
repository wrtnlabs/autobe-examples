import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test that a community moderator can successfully view pending content violation reports for their community.
 *
 * The test validates the moderator workflow for reviewing reported content:
 * 1. Create a member account and authenticate as community owner/moderator
 * 2. Create a community (owner becomes owner and moderator automatically)
 * 3. Create another member who will report content
 * 4. Create a third member who will create a post in the community
 * 5. Have the second member submit a report on the post with a reason
 * 6. Have the first member (moderator/owner) call the reports endpoint
 * 7. Verify the response includes the pending report with correct data
 * 8. Verify pagination metadata is correct
 */
export async function test_api_community_reports_moderator_view_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator/owner member and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community (owner becomes owner and moderator automatically)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 4. Create post author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorAuth);
  // 5. Author creates a text post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Reporter submits a report on the post
  const report = await generate_random_reddit_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Moderator views pending reports for the community
  const reportsResponse =
    await api.functional.redditPlatform.member.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // 8. Verify the response contains the reported post
  TestValidator.equals(
    "reports data is not empty",
    reportsResponse.data.length > 0,
    true,
  );
  const foundReport = reportsResponse.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "report exists in response",
    foundReport !== undefined,
  );
  if (foundReport) {
    TestValidator.equals(
      "report status is pending",
      foundReport.status,
      "pending",
    );
    TestValidator.equals(
      "reporter username matches",
      foundReport.reporter.username,
      reporterAuth.username,
    );
    TestValidator.equals(
      "post title matches",
      foundReport.post?.title,
      post.title,
    );
    TestValidator.predicate("report has reason", foundReport.reason.length > 0);
    TestValidator.predicate(
      "report has created_at",
      foundReport.created_at !== undefined,
    );
  }
  // 9. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    reportsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    reportsResponse.pagination.records >= 1,
  );
}
