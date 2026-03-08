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

export async function test_api_moderator_view_cross_community_report_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first community owner (Owner1)
  const owner1Connection: api.IConnection = { host: connection.host };
  const owner1Auth = await authorize_member_join(owner1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner1Auth);
  // Step 2: Create Community1 owned by Owner1
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      owner1Connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Step 3: Owner1 subscribes to Community1 (auto-subscribed on creation, but explicit subscription for clarity)
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    owner1Connection,
    {
      communityId: community1.id,
    },
  );
  // Step 4: Owner1 creates a post in Community1
  const post1 = await generate_random_reddit_platform_member_posts_create(
    owner1Connection,
    {
      body: {
        community_id: community1.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // Step 5: Create second member (Member2) who will report the post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2Auth);
  // Step 6: Member2 subscribes to Community1
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: community1.id,
    },
  );
  // Step 7: Member2 reports the post in Community1
  const report1 = await generate_random_reddit_platform_member_reports_create(
    member2Connection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post1.id,
      } satisfies IRedditPlatformReport.ICreate,
    },
  );
  typia.assert(report1);
  // Step 8: Create third member (Owner2) who will be moderator of different community
  const owner2Connection: api.IConnection = { host: connection.host };
  const owner2Auth = await authorize_member_join(owner2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(owner2Auth);
  // Step 9: Owner2 creates Community2 (different from Community1)
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      owner2Connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Step 10: Owner2 subscribes to Community2
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    owner2Connection,
    {
      communityId: community2.id,
    },
  );
  // Step 11: Owner2 attempts to view the report from Community1
  // This should fail with 403 Forbidden because Owner2 is not a moderator of Community1
  await TestValidator.httpError(
    "moderator from different community cannot view report",
    403,
    async () => {
      await api.functional.redditPlatform.member.reports.at(owner2Connection, {
        reportId: report1.id,
      });
    },
  );
}