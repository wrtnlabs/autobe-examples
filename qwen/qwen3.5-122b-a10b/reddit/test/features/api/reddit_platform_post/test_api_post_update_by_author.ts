import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
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
  // 3. Subscribe member to community (auto-subscribed as owner, but test subscription explicitly)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Create text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.paragraph({ sentences: 10 });
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: originalTitle,
        post_type: "text",
        text_content: originalContent,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Store original timestamp for comparison
  const originalUpdatedAt = post.updated_at;
  // 5. Update post with new title and content
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const newContent = RandomGenerator.paragraph({ sentences: 15 });
  const updatedPost = await api.functional.redditPlatform.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        text_content: newContent,
      } satisfies IRedditPlatformPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Verify updated post has correct data
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals(
    "text_content updated",
    updatedPost.text_content,
    newContent,
  );
  TestValidator.equals("post_type unchanged", updatedPost.post_type, "text");
  TestValidator.equals("author unchanged", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("vote_score initialized", updatedPost.vote_score, 0);
  TestValidator.equals(
    "comment_count initialized",
    updatedPost.comment_count,
    0,
  );
  // 7. Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at changed",
    updatedPost.updated_at !== originalUpdatedAt,
  );
}
