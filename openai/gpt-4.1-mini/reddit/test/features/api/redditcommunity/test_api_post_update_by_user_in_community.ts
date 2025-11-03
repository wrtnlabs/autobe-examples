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

export async function test_api_post_update_by_user_in_community(
  connection: api.IConnection,
) {
  // 1. Create user account for post update
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: `Passw0rd!${RandomGenerator.alphaNumeric(5)}`,
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://google.com",
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(user);

  // 2. Login user
  const userLoginBody = {
    email: userCreateBody.email,
    password: userCreateBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://google.com",
  } satisfies IRedditCommunityUser.ILogin;

  const loggedInUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: userLoginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create community for post context
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 4. Create post for updating
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 10,
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
      {
        communityName: communityCreateBody.name,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 5. Update the post
  const postUpdateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 12,
    }),
    image_uri: null,
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
  } satisfies IRedditCommunityPost.IUpdate;

  const updatedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.update(
      connection,
      {
        communityName: communityCreateBody.name,
        postId: post.id,
        body: postUpdateBody,
      },
    );
  typia.assert(updatedPost);

  // Validate updated post fields
  TestValidator.equals("post id matches", updatedPost.id, post.id);
  TestValidator.equals(
    "community id matches",
    updatedPost.reddit_community_community_id,
    post.reddit_community_community_id,
  );
  TestValidator.equals(
    "user id matches",
    updatedPost.reddit_community_user_id,
    post.reddit_community_user_id,
  );
  TestValidator.equals(
    "updated title matches",
    updatedPost.title,
    postUpdateBody.title,
  );
  TestValidator.equals(
    "updated body matches",
    updatedPost.body,
    postUpdateBody.body,
  );
  TestValidator.equals(
    "updated content type id matches",
    updatedPost.reddit_community_content_type_id,
    postUpdateBody.reddit_community_content_type_id,
  );
  TestValidator.equals(
    "updated status matches",
    updatedPost.status,
    postUpdateBody.status,
  );
}
