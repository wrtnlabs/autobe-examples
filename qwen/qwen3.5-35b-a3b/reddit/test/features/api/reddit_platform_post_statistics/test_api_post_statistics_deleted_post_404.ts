import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_post_statistics_deleted_post_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>() satisfies string as string & tags.MinLength<3> & tags.MaxLength<50> & tags.Pattern<"^[a-zA-Z0-9_]+$">,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      communityConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a post
  const post = await api.functional.redditPlatform.member.posts.create(
    communityConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        post_type: "text" as const,
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Verify post exists and is accessible
  const preDeleteStats =
    await api.functional.redditPlatform.member.posts.statistics(
      communityConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(preDeleteStats);
  TestValidator.predicate(
    "pre-delete statistics returned successfully",
    preDeleteStats.id === post.id,
  );
  // 6. Permanently delete the post
  await api.functional.redditPlatform.member.posts.erase(communityConnection, {
    postId: post.id,
  });
  // 7. Test statistics endpoint with deleted post - should return 404
  await TestValidator.error("deleted post statistics returns 404", async () => {
    await api.functional.redditPlatform.member.posts.statistics(
      communityConnection,
      {
        postId: post.id,
      },
    );
  });
  // 8. Test with non-existent post ID - should also return 404
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent post statistics returns 404",
    async () => {
      await api.functional.redditPlatform.member.posts.statistics(
        communityConnection,
        {
          postId: nonExistentId,
        },
      );
    },
  );
}