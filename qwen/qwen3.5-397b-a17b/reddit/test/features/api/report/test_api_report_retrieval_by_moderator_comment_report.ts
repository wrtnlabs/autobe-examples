import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test that a community moderator can successfully retrieve detailed information
 * about a report targeting a comment.
 *
 * Workflow:
 * 1. Create moderator account and authenticate
 * 2. Create community with moderator as owner
 * 3. Create a post in the community
 * 4. Create commenter account and subscribe to community
 * 5. Create a comment on the post
 * 6. Create reporter account
 * 7. Submit report against the comment
 * 8. Retrieve report details as moderator
 *
 * Validates: Report retrieval returns complete information including reporter
 * username, community details, target_type as 'COMMENT', violation reason,
 * and PENDING review status.
 */
export async function test_api_report_retrieval_by_moderator_comment_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Create community with moderator as owner
  const community = await generate_random_reddit_clone_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Create a post in the community (moderator creates post)
  const post = await generate_random_reddit_clone_member_posts_create(
    moderatorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  // 4. Create commenter account and authenticate
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenterAuth = await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(commenterAuth);
  // 5. Subscribe commenter to community
  const commenterSubscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      commenterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(commenterSubscription);
  // 6. Create a comment on the post
  const commentBody = RandomGenerator.content({ paragraphs: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      commenterConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: commentBody,
          parent_comment_id: null,
        },
      },
    );
  typia.assert(comment);
  // 7. Create reporter account and authenticate
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(reporterAuth);
  // 8. Submit report against the comment
  const violationReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      reporterConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          target_type: "COMMENT",
          target_id: comment.id,
          reason: violationReason,
        },
      },
    );
  typia.assert(report);
  // 9. Retrieve report details as moderator
  const retrievedReport =
    await api.functional.redditClone.member.communities.reports.at(
      moderatorConnection,
      {
        communityId: community.id,
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // Validate report details
  TestValidator.equals("report ID matches", retrievedReport.id, report.id);
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    reporterAuth.username,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedReport.community.id,
    community.id,
  );
  TestValidator.equals(
    "target type is COMMENT",
    retrievedReport.target_type,
    "COMMENT",
  );
  TestValidator.equals(
    "violation reason matches",
    retrievedReport.reason,
    violationReason,
  );
  TestValidator.equals(
    "review status is PENDING",
    retrievedReport.review_status,
    "PENDING",
  );
}
