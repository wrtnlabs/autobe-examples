import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_comment_retrieval_by_registered_user(
  connection: api.IConnection,
) {
  // Step 1: Registered user joins platform
  const email = `${RandomGenerator.name(1).toLowerCase()}@example.com`;
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: email,
    password: "testpassword",
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;
  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // Step 2: Create a new community with unique name
  const communityName = RandomGenerator.name(2)
    .replace(/\s+/g, "_")
    .toLowerCase();
  const communityBody = {
    communityName,
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postBody = {
    community_code: community.communityName,
    title: RandomGenerator.paragraph({ sentences: 5 }),
    type: "text",
    content: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.registeredUser.posts.create(
      connection,
      { body: postBody },
    );
  typia.assert(post);

  // Step 4: Create a comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const commentBody = {
    post_id: post.id,
    content: commentContent,
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.create(
      connection,
      { body: commentBody },
    );
  typia.assert(comment);

  // Step 5: Retrieve the comment by its ID
  const retrievedComment: IRedditCommunityComment =
    await api.functional.redditCommunity.registeredUser.redditCommunityComments.at(
      connection,
      { redditCommunityCommentId: comment.id },
    );
  typia.assert(retrievedComment);

  // Validate comment data correctness
  TestValidator.equals("comment IDs equal", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment post IDs equal",
    retrievedComment.post_id,
    post.id,
  );
  TestValidator.equals(
    "comment author IDs equal",
    retrievedComment.author_id,
    user.id,
  );
  TestValidator.equals(
    "comment content equal",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment parent_comment_id is null",
    retrievedComment.parent_comment_id,
    null,
  );
}
