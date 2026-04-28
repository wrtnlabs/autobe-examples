import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityReport";
import type { IREdditLikeCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityComment";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IREdditLikeCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReport";
import type { IREdditLikeCommunityReportOnComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnComment";
import type { IREdditLikeCommunityReportOnPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityReportOnPost";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_reports_create } from "../../../generate/generate_random_reddit_like_community_member_reports_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_report } from "../../../prepare/prepare_random_reddit_like_community_report";

export async function test_api_report_list_pending_reports_default_pagination(
  connection: api.IConnection,
) {
  // 1. Administrator authenticates as community owner and moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Moderator creates a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3. Moderator creates a post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: "Test Post Title",
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Reporter member authenticates
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 5. Reporter creates a report on the post
  const report =
    await generate_random_reddit_like_community_member_reports_create(
      reporterConnection,
      {
        body: {
          postId: post.id,
          reason: "Spam or inappropriate content violates community guidelines",
        } satisfies IREdditLikeCommunityReport.ICreate,
      },
    );
  typia.assert(report);
  // 6. Moderator retrieves pending reports with default pagination
  const request: IREdditLikeCommunityReport.IRequest = {
    status: "pending",
    communityId: community.id,
    targetType: "post",
  } satisfies IREdditLikeCommunityReport.IRequest;
  const response = await api.functional.redditLikeCommunity.reports.index(
    moderatorConnection,
    {
      body: request,
    },
  );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "Current page is 1 (default)",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "At least one record exists",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "At least one page exists",
    response.pagination.pages >= 1,
  );
  // 8. Validate report data matches created report
  TestValidator.predicate(
    "Report data array is not empty",
    response.data.length >= 1,
  );
  const foundReport = response.data.find((r) => r.id === report.id);
  typia.assertGuard(foundReport!);
  TestValidator.equals(
    "Report target type matches post",
    foundReport.target_type,
    "post",
  );
  TestValidator.equals(
    "Report status is pending",
    foundReport.status,
    "pending",
  );
  TestValidator.equals(
    "Report reporter matches reporter member",
    foundReport.reportedBy.id,
    reporter.id,
  );
  TestValidator.equals(
    "Report community matches created community",
    foundReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "Report reason matches input",
    foundReport.reason,
    "Spam or inappropriate content violates community guidelines",
  );
}
