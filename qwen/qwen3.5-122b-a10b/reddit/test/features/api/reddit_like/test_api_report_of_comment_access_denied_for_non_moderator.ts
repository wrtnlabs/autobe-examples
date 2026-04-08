import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a regular member who is not a moderator cannot access content reports for comments.
 *
 * Validates the access control enforcement that restricts report visibility to moderators only, protecting reporter anonymity and preventing unauthorized access to moderation data.
 *
 * The test creates a complete scenario with a community, post, comment, and report, then verifies that a non-moderator member cannot retrieve the report-of-comment record.
 *
 * 1. Create a community with an owner who becomes the moderator.
 * 2. Create a regular member account without moderator privileges.
 * 3. Create a post in the community.
 * 4. Create a comment on the post.
 * 5. Create a report on the comment.
 * 6. Attempt to retrieve the report-of-comment as the regular member.
 * 7. Verify the system returns an access denied response (403 or 404).
 */
export async function test_api_report_of_comment_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: "Test community for report access control",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Create regular member (non-moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create comment on the post
  const comment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditLikeComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Create report on the comment
  const report = await generate_random_reddit_like_member_reports_create(
    memberConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        reason: "This comment violates community guidelines",
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Attempt to retrieve the report-of-comment as non-moderator member
  // This should fail with access denied (403 or 404)
  await TestValidator.httpError(
    "non-moderator member cannot access report-of-comment",
    [403, 404],
    async () => {
      const reportOfComment =
        await api.functional.redditLike.member.reports_of_comments.at(
          memberConnection,
          {
            reportOfCommentId: report.id,
          },
        );
      typia.assert(reportOfComment);
    },
  );
}
