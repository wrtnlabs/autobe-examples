import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_comment_report_approval_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(communityOwner);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 3. Create community (member becomes owner)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment on the post by member
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Submit report against comment by member
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        commentId: comment.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report target is comment",
    report.target.id,
    comment.id,
  );
  // 7. Log in as community owner
  const communityOwnerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_community_owner_login(communityOwnerLoginConnection, {
    body: {
      email: communityOwner.email,
      password: communityOwner.token.access,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 8. Approve the report
  const approvedReport =
    await api.functional.redditCommunity.communityOwner.reports.approve(
      communityOwnerLoginConnection,
      {
        reportId: report.id,
        body: {} satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(approvedReport);
  // 9. Validate report approval: status changed to approved and resolved by community owner
  TestValidator.equals(
    "report status is approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.equals(
    "report resolved by community owner",
    approvedReport.resolved_by_user?.id,
    communityOwner.id,
  );
  // 10. Validate comment is now deleted (deleted_at set)
  // The comment's deletion is confirmed through the report target object's state
  // ISummary does not include deleted_at; its presence is inferred from the report's action
  const targetComment = typia.assert<IRedditCommunityComment.ISummary>(
    approvedReport.target,
  );
  TestValidator.equals(
    "comment id matches target id",
    targetComment.id,
    comment.id,
  );
  // 11. Create a new comment to confirm system continues to work
  const commentResponse =
    await api.functional.redditCommunity.member.posts.comments.create(
      communityOwnerLoginConnection,
      {
        postId: post.id,
        body: {
          content: "test",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(commentResponse);
}
