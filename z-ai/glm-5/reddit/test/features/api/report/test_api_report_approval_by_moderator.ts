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

export async function test_api_report_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (community owner/moderator) setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(ownerAuth);
  // 2. Member A creates a community (becomes owner with moderation privileges)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Member B (content creator/reporter) setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
    },
  });
  typia.assert(memberAuth);
  // 4. Member B subscribes to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 6. Member B reports the post
  const report = await generate_random_community_platform_member_reports_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(report);
  // Verify initial report status is 'pending'
  TestValidator.equals("initial report status", report.status, "pending");
  // 7. Member A (community owner/moderator) approves the report
  const approvedReport =
    await api.functional.communityPlatform.member.reports.update(
      ownerConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(approvedReport);
  // 8. Verify report status changed to 'approved'
  TestValidator.equals(
    "report status changed to approved",
    approvedReport.status,
    "approved",
  );
  // 9. Verify report audit trail is preserved
  TestValidator.equals("report ID preserved", approvedReport.id, report.id);
  TestValidator.equals(
    "report reason preserved",
    approvedReport.reason,
    report.reason,
  );
  TestValidator.equals(
    "report community preserved",
    approvedReport.community.id,
    report.community.id,
  );
  TestValidator.equals(
    "report reporter preserved",
    approvedReport.reporter.id,
    report.reporter.id,
  );
  // 10. Verify updated_at timestamp is set
  TestValidator.predicate(
    "updated_at is valid date-time",
    approvedReport.updated_at.length > 0,
  );
}
