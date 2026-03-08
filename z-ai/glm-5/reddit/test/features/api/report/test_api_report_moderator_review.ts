import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_moderator_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post author account
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 4. Subscribe post author to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    { body: { communityId: community.id } },
  );
  typia.assert(post);
  // 6. Create commenter account
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenter = await authorize_member_join(commenterConnection, {});
  typia.assert(commenter);
  // 7. Subscribe commenter to the community
  await generate_random_community_platform_member_subscriptions_create(
    commenterConnection,
    { body: { community_id: community.id } },
  );
  // 8. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      commenterConnection,
      { params: { postId: post.id } },
    );
  typia.assert(comment);
  // 9. Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  typia.assert(reporter);
  // 10. Subscribe reporter to the community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  // 11. Submit a report on the comment
  const reportReason = RandomGenerator.paragraph({ sentences: 3 });
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: reportReason,
        communityId: community.id,
        commentId: comment.id,
      },
    },
  );
  typia.assert(report);
  // 12. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 13. Appoint the moderator to the community (owner appoints)
  await generate_random_community_platform_member_communities_moderators_add_moderator(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: { username: moderator.username },
    },
  );
  // 14. Moderator retrieves the report details
  const retrievedReport =
    await api.functional.communityPlatform.member.reports.at(
      moderatorConnection,
      { reportId: report.id },
    );
  typia.assert(retrievedReport);
  // Validation
  TestValidator.equals("report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "content type is comment",
    retrievedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "reporter id matches",
    retrievedReport.reporter.id,
    reporter.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedReport.community.id,
    community.id,
  );
}
