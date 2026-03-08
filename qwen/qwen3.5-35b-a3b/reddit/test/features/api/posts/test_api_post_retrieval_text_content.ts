import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_retrieval_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 2. Community setup - create community where post will be published
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<30>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community - required to create posts
  const subscription: IRedditPlatformCommunitySubscription =
    await api.functional.redditPlatform.member.communities.subscribe(
      memberConnection,
      {
        communityId: community.id,
        body: { confirmSubscription: true },
      },
    );
  typia.assert(subscription);
  // 4. Create TEXT post in subscribed community
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const createdPost: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberConnection, {
      body: {
        title: postTitle,
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: postContent,
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(createdPost);
  // 5. Retrieve post by ID - no authentication required for GET
  const retrievedPost: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.at(connection, {
      postId: createdPost.id,
    });
  typia.assert(retrievedPost);
  // 6. Validate post retrieval response
  TestValidator.equals("post title matches", retrievedPost.title, postTitle);
  TestValidator.equals(
    "post content matches",
    retrievedPost.content,
    postContent,
  );
  TestValidator.equals("post type is TEXT", retrievedPost.postType, "TEXT");
  TestValidator.equals("vote score is 0", retrievedPost.voteScore, 0);
  TestValidator.equals("comment count is 0", retrievedPost.commentCount, 0);
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    memberAuthorized.username,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals("url is null for TEXT post", retrievedPost.url, null);
  TestValidator.equals(
    "image url is null for TEXT post",
    retrievedPost.imageUrl,
    null,
  );
  TestValidator.equals(
    "author display name matches",
    retrievedPost.author.displayName,
    memberAuthorized.displayName,
  );
  TestValidator.equals(
    "community description matches",
    retrievedPost.community.description,
    community.description,
  );
}
