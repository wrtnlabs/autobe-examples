import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_retrieve_text_post_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postContent = RandomGenerator.content({ paragraphs: 2 });
  const createdPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "text",
        text_content: postContent,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);
  // 5. Retrieve the post by ID
  const retrievedPost = await api.functional.redditCommunity.member.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Validate post details
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, postTitle);
  TestValidator.equals("post type is text", retrievedPost.post_type, "text");
  TestValidator.predicate(
    "text_content is not null",
    retrievedPost.text_content !== null,
  );
  TestValidator.equals(
    "text_content matches",
    retrievedPost.text_content,
    postContent,
  );
  TestValidator.predicate(
    "link_url is null for text post",
    retrievedPost.link_url === null,
  );
  TestValidator.predicate(
    "image_path is null for text post",
    retrievedPost.image_path === null,
  );
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    auth.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals("vote_score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals("comments_count is 0", retrievedPost.comments_count, 0);
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedPost.created_at !== null,
  );
}
