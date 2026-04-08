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
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that a member who is not a moderator or owner of a community cannot view reports for that community.
 *
 * Validates the access control rule that only moderators and owners can view community reports. The test creates two members where one owns a community and creates a report, then verifies the other member cannot access that report.
 *
 * 1. Create member 1 and authenticate as community owner.
 * 2. Member 1 creates a community (becomes owner).
 * 3. Member 1 creates a post in the community.
 * 4. Member 1 creates a report on the post.
 * 5. Create member 2 and authenticate as non-moderator.
 * 6. Member 2 attempts to view the report from member 1's community.
 * 7. Verify the request fails with 403 Forbidden or 404 Not Found status.
 */
export async function test_api_report_of_post_access_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member 1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1);
  // 2. Member 1 creates a community (becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Member 1 creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    member1Connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 4. Member 1 creates a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    member1Connection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(report);
  // Extract the reportOfPostId from the report response
  const reportOfPostId = report.postTarget.id;
  // 5. Create member 2 (non-moderator, non-owner)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2);
  // 6. Member 2 attempts to view the report from member 1's community
  // 7. Verify the request fails with 403 Forbidden or 404 Not Found
  await TestValidator.httpError(
    "non-moderator cannot view report",
    [403, 404],
    async () => {
      await api.functional.redditLike.member.reports_of_posts.at(
        member2Connection,
        {
          reportOfPostId: reportOfPostId,
        },
      );
    },
  );
}
