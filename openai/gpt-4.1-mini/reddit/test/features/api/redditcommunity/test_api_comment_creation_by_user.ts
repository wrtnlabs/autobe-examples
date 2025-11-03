import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_comment_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreateBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    ip: null,
    href: "https://example.com/registration",
    referrer: "https://referrer.example.com",
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(user);

  // 2. Log in the user
  const userLoginBody = {
    email: user.email,
    password: "StrongP@ssw0rd!",
    ip: null,
    href: "https://example.com/login",
    referrer: "https://referrer.example.com",
  } satisfies IRedditCommunityUser.ILogin;
  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: userLoginBody });
  typia.assert(loggedInUser);

  // 3. Create a new community
  const communityName = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    name: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "created community name matches",
    community.name,
    communityCreateBody.name,
  );

  // 4. Create a post in the community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
    image_uri: null,
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      { communityName: communityName, body: postCreateBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "created post title matches",
    post.title,
    postCreateBody.title,
  );

  // 5. Create comment on the post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 12 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Validate comment linkage
  TestValidator.equals(
    "comment post ID matches",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "comment user ID matches",
    comment.reddit_community_user_id,
    user.id,
  );
}
