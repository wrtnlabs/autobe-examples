import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

export async function test_api_comment_report_moderator_dismissal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account and create community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Create moderator account and assign as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  const moderator =
    await generate_random_reddit_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorAuth.id,
        },
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(moderator);
  // 3. Create regular member account and subscribe to community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  await api.functional.redditCommunity.member.communities.subscription.create(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create a post in the community as the regular member
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post as the regular member
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create reporter account and subscribe to community
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(reporterAuth);
  await api.functional.redditCommunity.member.communities.subscription.create(
    reporterConnection,
    {
      communityName: community.name,
    },
  );
  // 7. Reporter submits a report on the comment with a valid reason
  const report =
    await generate_random_reddit_community_member_comments_reports_create(
      reporterConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // Validate initial report status is PENDING
  TestValidator.equals("initial report status", report.status, "PENDING");
  const reportCreatedAt = report.created_at;
  const reportUpdatedAt = report.updated_at;
  // 8. Moderator updates the report status to DISMISSED
  const updatedReport =
    await api.functional.redditCommunity.member.comments.reports.update(
      moderatorConnection,
      {
        commentId: comment.id,
        reportId: report.id,
        body: {
          status: "DISMISSED",
        },
      },
    );
  typia.assert(updatedReport);
  // 9. Verify the report status is now DISMISSED
  TestValidator.equals(
    "report status after dismissal",
    updatedReport.status,
    "DISMISSED",
  );
  // 10. Verify the reported comment remains active (deleted_at is null)
  TestValidator.predicate(
    "comment remains active after dismissal",
    updatedReport.comment.deleted_at === null,
  );
  // 11. Verify the report's updated_at timestamp is updated
  TestValidator.notEquals(
    "report updated_at changed after dismissal",
    reportUpdatedAt,
    updatedReport.updated_at,
  );
  // Additional validations
  TestValidator.equals(
    "report comment id matches",
    updatedReport.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "report reporter matches",
    updatedReport.reporter.id,
    reporterAuth.id,
  );
  TestValidator.predicate(
    "comment content preserved",
    updatedReport.comment.content.length > 0,
  );
}
