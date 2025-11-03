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

export async function test_api_comment_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. User joins reddit_community with required info
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const ip = "127.0.0.1";
  const href = "https://example.com/current";
  const referrer = "https://example.com/referrer";
  const userJoinBody = {
    email,
    password: "StrongPass123!",
    ip,
    href,
    referrer,
  } satisfies IRedditCommunityUser.ICreate;
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinBody });
  typia.assert(user);

  // 2. User logs in
  const userLoginBody = {
    email,
    password: "StrongPass123!",
    ip,
    href,
    referrer,
  } satisfies IRedditCommunityUser.ILogin;
  const loginUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, { body: userLoginBody });
  typia.assert(loginUser);

  // 3. Create community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const communityCreateBody = {
    name: communityName,
    description: communityDescription,
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityName);

  // 4. Create post
  // We need content type id; generate a random UUID string with typia
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    reddit_community_content_type_id: contentTypeId,
    status: "active",
    image_uri: null, // optional and explicitly null
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post community id",
    post.reddit_community_community_id,
    community.id,
  );

  // 5. Create comment on post
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName,
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment post id",
    comment.reddit_community_post_id,
    post.id,
  );

  // 6. Delete comment
  await api.functional.redditCommunity.user.communities.posts.comments.erase(
    connection,
    {
      communityName,
      postId: post.id,
      commentId: comment.id,
    },
  );
}
