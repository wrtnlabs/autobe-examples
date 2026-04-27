import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_community_reports_create } from "../../../generate/generate_random_community_platform_member_community_reports_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_community_report } from "../../../prepare/prepare_random_community_platform_community_report";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the moderator approval workflow for a report targeting a post.
 *
 * Validates the complete approval flow: member A (community owner/moderator) creates a community, member B subscribes to it, creates a text post, and reports their own post. Member A then approves the report via the PUT endpoint.
 *
 * Confirms that the report status transitions from 'pending' to 'approved' and that the response is a full, valid {@link ICommunityPlatformCommunityReport} record with an updated timestamp.
 *
 * 1. Create member A (future community owner/moderator) via authorize_member_join.
 * 2. Member A creates a community via generate_random_community_platform_member_communities_create.
 * 3. Create member B (content creator and reporter) via authorize_member_join.
 * 4. Member B subscribes to the community via generate_random_community_platform_member_communities_subscribers_create.
 * 5. Member B creates a text post via generate_random_community_platform_member_posts_create.
 * 6. Member B reports their own post via generate_random_community_platform_member_community_reports_create.
 * 7. Member A approves the report via api.functional.communityPlatform.member.community_reports.update with status='approved'.
 * 8. Validate that the returned report has status 'approved' and updated_at is refreshed.
 */
export async function test_api_community_report_approval_for_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (community owner/moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create member B (reporter and content creator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B subscribes to the community (required to post)
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 5. Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // 6. Member B reports their own post
  const report =
    await generate_random_community_platform_member_community_reports_create(
      memberBConnection,
      {
        body: {
          targetId: post.id,
          targetType: "post",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunityReport.ICreate>,
      },
    );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  // 7. Member A (moderator) approves the report
  const updatedReport =
    await api.functional.communityPlatform.member.community_reports.update(
      memberAConnection,
      {
        reportId: report.id,
        body: {
          status: "approved",
        } satisfies ICommunityPlatformCommunityReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // 8. Validate the updated report
  TestValidator.equals(
    "report status changed to approved",
    updatedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "updated_at is refreshed",
    updatedReport.updated_at > report.updated_at,
  );
}
