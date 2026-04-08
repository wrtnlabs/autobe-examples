import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_post_reports_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (post creator)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuthorized = await authorize_member_join(
    firstMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(firstMemberAuthorized);
  // 2. Create a post in a community
  const post = await generate_random_reddit_community_member_posts_create(
    firstMemberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // 3. Register second member (reporter)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthorized = await authorize_member_join(
    secondMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(secondMemberAuthorized);
  // 4. Create a report on the post
  const report =
    await generate_random_reddit_community_member_posts_reports_create(
      secondMemberConnection,
      {
        params: { postId: post.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(report);
  // 5. List reports for that post (using second member's connection who created the report)
  const reportsList =
    await api.functional.redditCommunity.member.posts.reports.index(
      secondMemberConnection,
      {
        postId: post.id,
        body: {
          limit: 20,
          page: 1,
          sort: "created_at",
        },
      },
    );
  typia.assert(reportsList);
  // 6. Validate report listing
  TestValidator.equals("report count", reportsList.pagination.records, 1);
  TestValidator.equals("data length", reportsList.data.length, 1);
  const listedReport = reportsList.data[0];
  typia.assert(listedReport);
  TestValidator.equals("report id", listedReport.id, report.id);
  TestValidator.equals(
    "reporter id",
    listedReport.reporter.id,
    secondMemberAuthorized.id,
  );
  TestValidator.equals(
    "community id",
    listedReport.community.id,
    post.community.id,
  );
  TestValidator.equals("targetPost id", listedReport.targetPost?.id, post.id);
  TestValidator.equals(
    "targetPost title",
    listedReport.targetPost?.title,
    post.title,
  );
  TestValidator.equals(
    "status_id",
    listedReport.status_id,
    report.status_id.toString() as string,
  );
  TestValidator.equals("reason", listedReport.reason, report.reason);
  TestValidator.equals(
    "created_at",
    listedReport.created_at,
    report.created_at,
  );
  TestValidator.equals(
    "updated_at",
    listedReport.updated_at,
    report.updated_at,
  );
  TestValidator.equals("pagination current", reportsList.pagination.current, 1);
  TestValidator.equals("pagination limit", reportsList.pagination.limit, 20);
  TestValidator.equals("pagination pages", reportsList.pagination.pages, 1);
}