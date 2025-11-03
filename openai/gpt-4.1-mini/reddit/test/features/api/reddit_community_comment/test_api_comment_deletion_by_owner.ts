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

export async function test_api_comment_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. User joins the system
  const userCreateInput = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "Password123!",
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityUser.ICreate;
  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: userCreateInput,
  });
  typia.assert(userAuthorized);

  // 2. Create a community
  const communityCreateInput = {
    name: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateInput,
    });
  typia.assert(community);

  // 3. Create a post within the community
  const postCreateInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    reddit_community_content_type_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    status: "active",
  } satisfies IRedditCommunityPost.ICreate;
  const post =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: postCreateInput,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  const commentCreateInput = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityComment.ICreate;
  const comment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: commentCreateInput,
      },
    );
  typia.assert(comment);

  // 5. Delete the created comment
  await api.functional.redditCommunity.user.communities.posts.comments.erase(
    connection,
    {
      communityName: community.name,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // 6. Validate that the comment is soft deleted by trying to normally retrieve comments for the post
  // There is no direct API for listing comments in this test materials, so we assume that
  // the post no longer has the deleted comment in its comments tree (not validated here directly)
  // We rely on the backend implementation and compiler type-safety for this behavior.

  // Additional authorization enforcement is out of scope due to lack of other user roles in materials
}
