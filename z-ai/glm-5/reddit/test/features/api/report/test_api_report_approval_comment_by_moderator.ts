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

export async function test_api_report_approval_comment_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPass123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(owner);
  // 2. Create a community as owner
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as member B (appointed moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ModeratorPass123!",
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(moderator);
  // 4. Owner appoints member B as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { username: moderator.member.username },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Authenticate as member C (content creator)
  const creatorConnection: api.IConnection = { host: connection.host };
  const creator = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CreatorPass123!",
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(creator);
  // 6. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      creatorConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 7. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    creatorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 8. Create a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      creatorConnection,
      {
        params: { postId: post.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // 9. Authenticate as member D (reporter)
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ReporterPass123!",
      username: `reporter_${RandomGenerator.alphaNumeric(8)}`,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(reporter);
  // 10. Create a report targeting the comment
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        communityId: community.id,
        commentId: comment.id,
      },
    },
  );
  typia.assert(report);
  // Test: Moderator approves the report
  const approvedReport =
    await api.functional.communityPlatform.member.reports.approve(
      moderatorConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(approvedReport);
  // Validations
  TestValidator.equals(
    "report status should be approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report should reference the correct community",
    approvedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "report content_type should be comment",
    approvedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "reported content should be the comment",
    approvedReport.content.id,
    comment.id,
  );
  TestValidator.predicate(
    "report should have reporter info",
    approvedReport.reporter.id === reporter.member.id,
  );
}
