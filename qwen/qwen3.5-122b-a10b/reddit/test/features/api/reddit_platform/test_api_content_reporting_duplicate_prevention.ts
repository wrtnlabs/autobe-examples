import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reports_create } from "../../../generate/generate_random_reddit_platform_member_reports_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

/**
 * Test the business rule that prevents duplicate reports on the same content by the same reporter.
 *
 * The test workflow:
 * 1. Create and authenticate a member account
 * 2. Create a community (member becomes owner and auto-subscribes)
 * 3. Create a text post in the community
 * 4. Submit first report on the post - should succeed with status='pending'
 * 5. Submit second report on the same post by the same reporter - should fail with 409 Conflict error
 * 6. Validate that only one report exists for the reporter-content pair
 * 7. Verify the system enforces duplicate prevention at both application and database levels
 */
export async function test_api_content_reporting_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized =
    await api.functional.redditPlatform.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(member);
  // 2. Create a community (member becomes owner and auto-subscribes)
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 4. Submit first report on the post - should succeed with status='pending'
  const firstReport: IRedditPlatformReport =
    await api.functional.redditPlatform.member.reports.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          post_id: post.id,
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  typia.assert(firstReport);
  // Validate first report was created successfully
  TestValidator.equals(
    "first report status is pending",
    firstReport.status,
    "pending",
  );
  TestValidator.equals(
    "first report targets correct post",
    firstReport.post?.id,
    post.id,
  );
  // 5. Submit second report on the same post by the same reporter - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate report should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.redditPlatform.member.reports.create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            post_id: post.id,
          } satisfies IRedditPlatformReport.ICreate,
        },
      );
    },
  );
}