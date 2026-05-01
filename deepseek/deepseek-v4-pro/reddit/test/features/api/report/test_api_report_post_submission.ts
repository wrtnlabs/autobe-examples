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
 * Test filing a report against a post to initiate the moderation workflow.
 *
 * Validates the complete report submission flow: a member registers, creates a
 * community, subscribes, creates a text post, and then files a report against
 * that post with an explicit reason. The test confirms the report enters the
 * moderation pipeline in the correct initial state.
 *
 * 1. A new member registers and authenticates via authorize_member_join.
 * 2. The member creates a community using the generation utility.
 * 3. The member subscribes to the community to enable posting.
 * 4. A text post is created in the community using the generation utility.
 * 5. The member files a report against the post with a written reason.
 * 6. Validates that the report is created with status "pending", target_type
 *    "post", the target_id matches the post, the reporter and community
 *    identities are correct, the reason is preserved, and the created_at
 *    matches updated_at since no status transition has occurred.
 */
export async function test_api_report_post_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" },
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. File a report against the post
  const reason =
    "This post contains inappropriate content that violates community guidelines.";
  const report = await api.functional.communityHub.member.reports.create(
    memberConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason,
      } satisfies ICommunityHubReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Validate report properties
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target_type is post",
    report.target_type,
    "post",
  );
  TestValidator.equals(
    "report target_id matches post id",
    report.target_id,
    post.id,
  );
  TestValidator.equals(
    "reporter id matches authenticated member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report community matches post community",
    report.community.id,
    community.id,
  );
  TestValidator.equals(
    "report reason matches submitted reason",
    report.reason,
    reason,
  );
  TestValidator.equals(
    "created_at matches updated_at before status transition",
    report.created_at,
    report.updated_at,
  );
}
