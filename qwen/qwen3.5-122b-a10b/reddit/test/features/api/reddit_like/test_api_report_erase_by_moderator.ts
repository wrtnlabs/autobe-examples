import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
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
import { generate_random_reddit_like_member_communities_moderators_create } from "../../../generate/generate_random_reddit_like_member_communities_moderators_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_moderator } from "../../../prepare/prepare_random_reddit_like_community_moderator";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test moderator can erase a content report from moderation queue.
 *
 * Validates that a community moderator can successfully soft-delete a content report from their community's moderation queue. The test workflow involves creating two member accounts, establishing a community with owner-moderator relationship, creating content, submitting a report, and verifying the moderator can erase the report.
 *
 * 1. First member authenticates via join endpoint.
 * 2. First member creates a community and becomes the owner.
 * 3. Second member authenticates via join endpoint.
 * 4. Owner adds second member as moderator to the community.
 * 5. First member creates a text post in the community.
 * 6. Second member (moderator) creates a report on the post with a reason.
 * 7. Moderator calls the erase report endpoint with the report ID.
 * 8. Verifies the erase operation completes successfully (returns 204 No Content).
 */
export async function test_api_report_erase_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (will be community owner) authenticates
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(ownerAuthorized);
  // 2. First member creates a community (becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Second member authenticates (will be added as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(moderatorAuthorized);
  // 4. Owner adds second member as moderator
  const moderatorAssignment =
    await generate_random_reddit_like_member_communities_moderators_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorAuthorized.id,
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. First member (owner) creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    ownerConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Second member (moderator) creates a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    moderatorConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 7. Moderator erases the report (returns 204 No Content)
  await api.functional.redditLike.member.reports.erase(moderatorConnection, {
    reportId: report.id,
  });
}
