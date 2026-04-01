import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that a non-moderator member cannot update a comment report status.
 *
 * This test verifies the authorization validation where a regular community member
 * (who is not a moderator) attempts to update a comment report status and is rejected.
 *
 * Test Flow:
 * 1. Community owner creates a community
 * 2. Regular member subscribes to the community (not a moderator)
 * 3. Content creator subscribes and creates a post with a comment
 * 4. Reporter subscribes and submits a report on the comment
 * 5. Regular member (non-moderator) attempts to update the report status
 * 6. Verify the request is rejected with authorization error
 */
export async function test_api_comment_report_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
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
  // 2. Create regular member (non-moderator) and subscribe
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  typia.assert(regularMemberAuth);
  const regularMemberSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      regularMemberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(regularMemberSubscription);
  // 3. Create content creator and subscribe
  const creatorConnection: api.IConnection = { host: connection.host };
  const creatorAuth = await authorize_member_join(creatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(creatorAuth);
  const creatorSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      creatorConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(creatorSubscription);
  // 4. Content creator creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    creatorConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Content creator creates a comment on the post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      creatorConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Create reporter and subscribe
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporterAuth);
  const reporterSubscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      reporterConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(reporterSubscription);
  // 7. Reporter submits a report on the comment
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
  // Verify report is in PENDING status
  TestValidator.equals("report initial status", report.status, "PENDING");
  // 8. Regular member (non-moderator) attempts to update the report status
  await TestValidator.error(
    "non-moderator cannot update report status",
    async () => {
      await api.functional.redditCommunity.member.comments.reports.update(
        regularMemberConnection,
        {
          commentId: comment.id,
          reportId: report.id,
          body: {
            status: "APPROVED",
          },
        },
      );
    },
  );
}
