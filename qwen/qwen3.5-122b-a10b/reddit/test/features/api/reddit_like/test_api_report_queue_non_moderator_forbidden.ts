import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a regular member without moderator privileges cannot access another community's report queue.
 *
 * Validates the access control rule that only moderators and owners can view report queues for their communities. This test ensures proper authorization enforcement when attempting to access sensitive moderation data.
 *
 * The test follows these steps:
 *
 * 1. First member (owner) joins and creates a community
 * 2. Owner creates a post in their community
 * 3. Second member joins and reports the post
 * 4. Third member (non-moderator) attempts to access the report queue
 * 5. Verifies the request returns 403 Forbidden error
 *
 * This validates that report queue access is properly restricted to community moderators and owners only.
 */
export async function test_api_report_queue_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (community owner) joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Owner creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Second member (reporter) joins
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(reporterAuth);
  // 5. Reporter reports the post
  const report = await generate_random_reddit_like_member_reports_create(
    reporterConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Third member (non-moderator) joins
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorAuth = await authorize_member_join(nonModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(nonModeratorAuth);
  // 7. Non-moderator attempts to access report queue (should fail with 403)
  await TestValidator.httpError(
    "non-moderator cannot access report queue",
    403,
    async () => {
      await api.functional.redditLike.member.communities.reports.queue(
        nonModeratorConnection,
        {
          communityCode: community.name,
        },
      );
    },
  );
}
