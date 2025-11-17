import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComments";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_comment_update_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const authorizedUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: userCreateBody,
    },
  );
  typia.assert(authorizedUser);

  // 2. Create a new community
  const communityName =
    RandomGenerator.alphabets(5) + RandomGenerator.alphaNumeric(3); // communityName pattern: lowercase letters/numbers/_- min 3 characters
  const communityCreateBody = {
    communityName: communityName.toLowerCase(),
    displayName: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const communityCreated =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(communityCreated);

  // 3. Create a new post
  const postCreateBody = {
    reddit_community_community_id: communityCreated.communityName,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    link_url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;
  const postCreated =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.create(
      connection,
      { body: postCreateBody },
    );
  typia.assert(postCreated);

  // 4. Create a comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const commentCreated =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.create(
      connection,
      {
        postId: postCreated.id,
        body: commentCreateBody,
      },
    );
  typia.assert(commentCreated);

  // 5. Update the comment
  const commentUpdateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IRedditCommunityComments.IUpdate;
  const commentUpdated =
    await api.functional.redditCommunity.registeredUser.redditCommunity.posts.comments.update(
      connection,
      {
        postId: postCreated.id,
        commentId: commentCreated.id,
        body: commentUpdateBody,
      },
    );
  typia.assert(commentUpdated);

  // 6. Verify comment ID unchanged
  TestValidator.equals(
    "comment ID unchanged after update",
    commentUpdated.id,
    commentCreated.id,
  );

  // 7. Verify updated_at timestamp >= created_at timestamp
  TestValidator.predicate(
    "comment updated_at is later than or equal to created_at",
    new Date(commentUpdated.updated_at) >= new Date(commentUpdated.created_at),
  );

  // 8. Verify comment body updated content
  TestValidator.equals(
    "comment body updated",
    commentUpdated.body,
    commentUpdateBody.body,
  );
}
