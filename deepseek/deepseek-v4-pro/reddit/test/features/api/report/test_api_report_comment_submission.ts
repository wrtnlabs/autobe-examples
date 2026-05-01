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
import { generate_random_community_hub_posts_comments_create } from "../../../generate/generate_random_community_hub_posts_comments_create";
import { prepare_random_community_hub_comment } from "../../../prepare/prepare_random_community_hub_comment";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";
import { prepare_random_community_hub_report } from "../../../prepare/prepare_random_community_hub_report";

/**
 * Test report submission against a comment within a community.
 *
 * Validates the complete report creation workflow: a member registers, creates a community, subscribes to it, publishes a text post, adds a top-level comment, and then files a report against that comment with a written reason.
 *
 * The test verifies that the report is created with status "pending", the target_type is "comment", the target_id matches the created comment's UUID, the community context is correctly derived from the comment's parent post, the reporter identity matches the authenticated member, and the reason text is preserved. It also confirms that the report is independent — the reported comment remains intact without modification.
 *
 * 1. A member registers and authenticates via authorize_member_join.
 * 2. The member creates a new community and subscribes to it.
 * 3. A text post is published in the community.
 * 4. A top-level comment is created on the post.
 * 5. A report is filed against the comment with a custom reason.
 * 6. The report's properties are validated including status, target_type, target_id, community derivation, reporter identity, and reason.
 */
export async function test_api_report_comment_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
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
  // 5. Create a top-level comment on the post
  const comment = await generate_random_community_hub_posts_comments_create(
    memberConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. File a report against the comment
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const report = await generate_random_community_hub_member_reports_create(
    memberConnection,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        reason,
      },
    },
  );
  typia.assert(report);
  // 7. Validate the report
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target_type is comment",
    report.target_type,
    "comment",
  );
  TestValidator.equals(
    "report target_id matches comment",
    report.target_id,
    comment.id,
  );
  TestValidator.equals(
    "report reason matches submitted text",
    report.reason,
    reason,
  );
  TestValidator.equals(
    "report reporter is the authenticated member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report community is derived from the comment's parent post",
    report.community.id,
    community.id,
  );
}
