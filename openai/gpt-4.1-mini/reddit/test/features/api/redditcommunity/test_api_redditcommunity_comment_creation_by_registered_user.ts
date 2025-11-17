import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_comment_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (join) to create user context
  const registeredUserPayload = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "TestPassword123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredUserPayload,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityCreatePayload = {
    communityName: RandomGenerator.alphabets(10).toLowerCase(),
    displayName: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreatePayload,
      },
    );
  typia.assert(community);

  // 3. Create a new post in the community
  const postCreatePayload = {
    reddit_community_community_id: typia.random<string & tags.Format<"uuid">>(),
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      {
        body: postCreatePayload,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreatePayload = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreatePayload,
      },
    );
  typia.assert(comment);

  // Validations
  TestValidator.equals("comment post ID matches", comment.post_id, post.id);
  TestValidator.equals("comment author ID matches", comment.author.id, user.id);
  TestValidator.predicate(
    "comment content is not empty",
    comment.content.length > 0,
  );
}
