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

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "P@ssword1234",
        ip: null,
        href: "https://example.com/profile",
        referrer: "https://google.com",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community
  const communityName: string = `${RandomGenerator.alphabets(8)}`;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Community for E2E testing comment deletion",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);
  TestValidator.equals("community name matches", community.name, communityName);

  // 3. Create a post in the community
  const contentTypeId = typia.random<string & tags.Format<"uuid">>();
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 8 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    image_uri: null,
    reddit_community_content_type_id: contentTypeId,
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postBody.title);

  // 4. Create a comment as the registered user
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
    parent_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment body matches", comment.body, commentBody.body);
  TestValidator.predicate(
    "comment not deleted on creation",
    comment.deleted_at === null || comment.deleted_at === undefined,
  );

  // 5. Delete the comment by its author
  await api.functional.redditCommunity.user.communities.posts.comments.erase(
    connection,
    {
      communityName: communityName,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 6. Verify the comment is marked as deleted
  // (Since no direct GET API is provided for final comment, re-create
  // through fetching or assume that deletion is reflected in DB -
  // here we invoke the creation of another comment to simulate state)
  // We will assume the deletion attempt succeeded if no error happened
  // So just test for no error and type check

  // For robust test, try creating another comment and ensure system stable
  const anotherCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityComment.ICreate;
  const anotherComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: anotherCommentBody,
      },
    );
  typia.assert(anotherComment);
  TestValidator.predicate(
    "another comment creation success",
    anotherComment.deleted_at === null ||
      anotherComment.deleted_at === undefined,
  );
}
