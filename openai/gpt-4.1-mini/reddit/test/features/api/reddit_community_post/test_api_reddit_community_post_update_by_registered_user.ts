import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_post_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Registered user joins and authenticates
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: `user${typia.random<string & tags.Format<"email">>()}`,
        password: "SafePassword123!",
        ip: null,
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(user);

  // 2. Create a new reddit community
  // Community name must be unique globally, so randomized
  const communityCreate: IRedditCommunityCommunity.ICreate = {
    communityName: `autobe_test_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
  };
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 3. Create a new post in the created community
  const postCreate: IRedditCommunityPost.ICreate = {
    community_code: community.communityName,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 7,
    }),
  };
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      {
        body: postCreate,
      },
    );
  typia.assert(post);

  // 4. Update the created post with new title, content, and type
  const postUpdateBody: IRedditCommunityPost.IUpdate = {
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 6 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 7,
    }),
  };
  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.update(
      connection,
      {
        postId: post.id,
        body: postUpdateBody,
      },
    );
  typia.assert(updatedPost);

  // 5. Validate updates
  // - Updated post fields differ from original
  // - Updated_at is newer than created_at
  TestValidator.notEquals(
    "Post title should be updated",
    post.title,
    updatedPost.title,
  );
  TestValidator.notEquals(
    "Post content should be updated",
    post.content,
    updatedPost.content,
  );
  TestValidator.equals("Post type should be 'text'", updatedPost.type, "text");

  const createdAtDate = new Date(post.created_at).getTime();
  const updatedAtDate = new Date(updatedPost.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedAtDate > createdAtDate,
  );
}
