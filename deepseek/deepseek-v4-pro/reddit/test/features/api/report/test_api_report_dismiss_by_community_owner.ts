import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { generate_random_community_hub_member_reports_create } from "../../../generate/generate_random_community_hub_member_reports_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_report } from "../../../prepare/prepare_random_community_hub_report";

/**
 * Test that a community owner can dismiss a pending report and the reported content remains intact.
 *
 * Validates the complete report dismissal workflow where the community owner dismisses a report filed against a post in their own community. The test covers the full lifecycle: member registration, community creation, subscription, post creation, report filing, and final dismissal.
 *
 * The community owner holds implicit moderator authority and can dismiss reports without needing explicit moderator appointment. The dismissal transitions the report from "pending" to "dismissed" status without affecting the reported content.
 *
 * 1. Member registers and authenticates via join endpoint, becoming the community owner.
 * 2. Owner creates a new community and subscribes to it as a prerequisite for posting.
 * 3. Owner creates a text post within the community to serve as the report target.
 * 4. Owner files a report against the created post, entering the moderation workflow.
 * 5. Owner dismisses the report, transitioning it from "pending" to "dismissed".
 * 6. Validates that the dismissed report status is "dismissed" and the updated_at timestamp reflects the dismissal time, differing from created_at.
 */
export async function test_api_report_dismiss_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (prerequisite for posting)
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      ownerConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. File a report against the post
  const report = await generate_random_community_hub_member_reports_create(
    ownerConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
      },
    },
  );
  typia.assert(report);
  // 6. Dismiss the report as community owner
  const dismissedReport =
    await api.functional.communityHub.member.reports.dismiss(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(dismissedReport);
  // 7. Validate dismissal results
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.notEquals(
    "updated_at reflects dismissal time",
    dismissedReport.updated_at,
    dismissedReport.created_at,
  );
}
