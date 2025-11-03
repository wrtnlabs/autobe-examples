import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_comment_vote_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin user
  const adminEmail = `${RandomGenerator.name(2).replace(/ /g, ".").toLowerCase()}@admin.com`;
  const adminUser: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminUser);

  // 2. Log in as the admin user
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "default-password",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create a community
  const communityName: string =
    RandomGenerator.name(1).replace(/ /g, "_") +
    Math.floor(Math.random() * 10000);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: `Test community ${communityName}`,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 4. Create a post in the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: communityName,
        body: {
          title: `Post title ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          reddit_community_content_type_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          status: "active",
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 5. Create a comment on the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.user.communities.posts.comments.create(
      connection,
      {
        communityName: communityName,
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. Create a vote on the comment by admin user - upvote
  const voteUp: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.admin.communities.comments.votes.create(
      connection,
      {
        communityName: communityName,
        commentId: comment.id,
        body: {
          reddit_community_comment_id: comment.id,
          vote_type: "upvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(voteUp);
  TestValidator.equals(
    "Comment vote upvote matches",
    voteUp.vote_type,
    "upvote",
  );

  // 7. Create a vote on the comment by admin user - downvote
  const voteDown: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.admin.communities.comments.votes.create(
      connection,
      {
        communityName: communityName,
        commentId: comment.id,
        body: {
          reddit_community_comment_id: comment.id,
          vote_type: "downvote",
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(voteDown);
  TestValidator.equals(
    "Comment vote downvote matches",
    voteDown.vote_type,
    "downvote",
  );
}
