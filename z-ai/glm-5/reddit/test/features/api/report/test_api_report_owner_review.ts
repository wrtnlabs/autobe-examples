import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_report_owner_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  // 2. Create a community (owner automatically becomes the owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create post author account
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  // 4. Author subscribes to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    { body: { community_id: community.id } },
  );
  // 5. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(3),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 6. Create reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {});
  // 7. Reporter subscribes to the community
  await generate_random_community_platform_member_subscriptions_create(
    reporterConnection,
    { body: { community_id: community.id } },
  );
  // 8. Submit a report on the post
  const report = await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 3 }),
        communityId: community.id,
        postId: post.id,
      },
    },
  );
  typia.assert(report);
  // 9. Owner retrieves the report details
  const retrievedReport =
    await api.functional.communityPlatform.member.reports.at(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);
  // Validate report details
  TestValidator.equals("Report id matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "Report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "Report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.predicate(
    "Report has created_at",
    !!retrievedReport.created_at,
  );
  TestValidator.predicate(
    "Report has updated_at",
    !!retrievedReport.updated_at,
  );
  // Validate reporter summary
  TestValidator.equals(
    "Reporter id matches",
    retrievedReport.reporter.id,
    reporterAuth.member.id,
  );
  TestValidator.equals(
    "Reporter username matches",
    retrievedReport.reporter.username,
    reporterAuth.member.username,
  );
  TestValidator.equals(
    "Reporter display_name matches",
    retrievedReport.reporter.display_name,
    reporterAuth.member.display_name,
  );
  // Validate community summary
  TestValidator.equals(
    "Community id matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "Community name matches",
    retrievedReport.community.name,
    community.name,
  );
  TestValidator.equals(
    "Community description matches",
    retrievedReport.community.description,
    community.description,
  );
  // Validate content
  TestValidator.equals(
    "Content type is post",
    retrievedReport.content_type,
    "post",
  );
  // Validate content is a post with correct details
  const content = retrievedReport.content as ICommunityPlatformPost;
  TestValidator.equals("Content post id matches", content.id, post.id);
  TestValidator.equals("Content post title matches", content.title, post.title);
  TestValidator.equals(
    "Content post author id matches",
    content.author.id,
    post.author.id,
  );
}
