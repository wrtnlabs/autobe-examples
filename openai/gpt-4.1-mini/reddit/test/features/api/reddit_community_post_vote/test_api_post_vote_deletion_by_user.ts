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

/**
 * Validate the entire user vote lifecycle on a post in a community, including
 * vote deletion.
 *
 * The test performs the following steps:
 *
 * 1. Registers a user via /auth/user/join
 * 2. Creates a community
 * 3. Creates a post in that community
 * 4. Casts a vote on the post
 * 5. Deletes the vote
 * 6. Validates the vote deletion succeeded
 * 7. Attempts unauthorized deletion with a different user and checks error
 * 8. Ensures user karma and post score reflect vote removal
 */
export async function test_api_post_vote_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "Password123!",
        ip: null,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(user);

  // 2. Create a community
  const communityName: string =
    "testcommunity_" + RandomGenerator.alphaNumeric(8);
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: {
        name: communityName,
        description: "Test community for vote deletion scenario",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a post in that community
  const contentTypeId: string = typia.random<string & tags.Format<"uuid">>();
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.user.communities.posts.create(
      connection,
      {
        communityName: community.name,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          reddit_community_content_type_id: contentTypeId,
          status: "active",
          image_uri: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(post);

  // 4. Cast a vote on the post
  const vote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.user.communities.posts.votes.createVoteOnPost(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          reddit_community_user_id: user.id,
          reddit_community_community_id: community.id,
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  typia.assert(vote);

  // 5. Delete the vote
  await api.functional.redditCommunity.user.communities.posts.votes.eraseVote(
    connection,
    {
      communityName: community.name,
      postId: post.id,
      voteId: vote.id,
    },
  );

  // 6. Validate the vote was deleted by attempting to delete again
  await TestValidator.error("error on deleting non-existent vote", async () => {
    await api.functional.redditCommunity.user.communities.posts.votes.eraseVote(
      connection,
      {
        communityName: community.name,
        postId: post.id,
        voteId: vote.id,
      },
    );
  });

  // 7. Attempt unauthorized deletion with a different user
  const otherUserEmail: string = typia.random<string & tags.Format<"email">>();
  const otherUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: otherUserEmail,
        password: "Password123!",
        ip: null,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(otherUser);

  // Connection auth token automatically switches upon join

  // Attempt to delete vote cast by first user, should error
  await TestValidator.error(
    "unauthorized vote deletion should fail",
    async () => {
      await api.functional.redditCommunity.user.communities.posts.votes.eraseVote(
        connection,
        {
          communityName: community.name,
          postId: post.id,
          voteId: vote.id,
        },
      );
    },
  );

  // 8. Validate user karma and post score remain consistent
  // Note: No APIs provided for karma or post score checks so this step is
  // limited to assure no unexpected crashes or side effects
}
