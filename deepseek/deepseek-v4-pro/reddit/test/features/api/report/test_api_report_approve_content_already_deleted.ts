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
 * Test report approval idempotency when reported content has already been deleted.
 *
 * Verifies that a community owner can successfully approve a pending report even when the reported post has been soft-deleted prior to the approval action. The specification states that when the post is already deleted (`deleted_at` is not null), the approval must proceed without error — the content deletion step in the transaction becomes a no-op for the already-deleted post.
 *
 * This test ensures the atomic transaction logic handles the edge case where content removal has already occurred, preventing the approval from failing due to a missing or already-deleted target. The report status must still transition to "approved" and the timestamp must update to reflect the approval time.
 *
 * 1. Community owner registers and creates a community, then subscribes and publishes a text post.
 * 2. A second member registers and files a report against the owner's post, creating a pending report.
 * 3. The owner (post author) deletes the post, simulating content removal prior to moderator review.
 * 4. The owner approves the report — must return status "approved" without error despite the post already being soft-deleted.
 */
export async function test_api_report_approve_content_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registration and community setup
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  await api.functional.communityHub.member.communities.subscriptions.create(
    ownerConnection,
    { communityName: community.name },
  );
  const post = await generate_random_community_hub_communities_posts_create(
    ownerConnection,
    { params: { communityName: community.name } },
  );
  typia.assert(post);
  // 2. Reporter registration and report filing
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reporterConnection, {});
  const report = await generate_random_community_hub_member_reports_create(
    reporterConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        reason: "Test report for content already deleted scenario",
      },
    },
  );
  typia.assert(report);
  // 3. Delete the post before approving the report
  await api.functional.communityHub.posts.erase(ownerConnection, {
    postId: post.id,
  });
  // 4. Owner approves the report (content already deleted)
  const approvedReport =
    await api.functional.communityHub.member.reports.approve(ownerConnection, {
      reportId: report.id,
    });
  typia.assert(approvedReport);
  // 5. Validate
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.predicate(
    "updated_at reflects approval time",
    approvedReport.updated_at !== report.updated_at,
  );
}
