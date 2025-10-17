import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that deleting a post preserves the author's earned karma from that post.
 *
 * This test validates the karma system integrity requirement that prevents
 * karma manipulation through content deletion. When a user creates a post and
 * earns karma through upvotes, that karma should remain with the user even
 * after the post is deleted.
 *
 * Workflow:
 *
 * 1. Create author member account for post creation and deletion
 * 2. Author creates a community where the post will be published
 * 3. Author creates a post that will earn karma then be deleted
 * 4. Retrieve author's initial karma (should be 0 for new account)
 * 5. Create voter member account using a separate connection
 * 6. Voter upvotes the post to increase author karma
 * 7. Retrieve author karma after vote to confirm increase
 * 8. Author deletes the post (using original author connection)
 * 9. Retrieve author karma after deletion to verify preservation
 * 10. Validate that karma earned from votes is preserved after deletion
 */
export async function test_api_post_deletion_karma_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create author member account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorPassword = typia.random<string & tags.MinLength<8>>();
  const authorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: authorUsername,
      email: authorEmail,
      password: authorPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Author creates a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Author creates a post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Retrieve author's initial karma (should be 0 for new account)
  const initialKarma = await api.functional.redditLike.users.karma.at(
    connection,
    {
      userId: author.id,
    },
  );
  typia.assert(initialKarma);

  TestValidator.equals(
    "initial post karma should be 0",
    initialKarma.post_karma,
    0,
  );

  // Step 5: Create voter member account using a separate connection
  const voterConnection = { ...connection, headers: {} };

  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterPassword = typia.random<string & tags.MinLength<8>>();
  const voterUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const voter = await api.functional.auth.member.join(voterConnection, {
    body: {
      username: voterUsername,
      email: voterEmail,
      password: voterPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(voter);

  // Step 6: Voter upvotes the post
  const vote = await api.functional.redditLike.member.posts.votes.create(
    voterConnection,
    {
      postId: post.id,
      body: {
        vote_value: 1,
      } satisfies IRedditLikePostVote.ICreate,
    },
  );
  typia.assert(vote);

  // Step 7: Retrieve author karma after vote to confirm increase
  const karmaAfterVote = await api.functional.redditLike.users.karma.at(
    voterConnection,
    {
      userId: author.id,
    },
  );
  typia.assert(karmaAfterVote);

  TestValidator.predicate(
    "post karma should increase after upvote",
    karmaAfterVote.post_karma > initialKarma.post_karma,
  );

  // Step 8: Author deletes the post (using original author connection)
  await api.functional.redditLike.member.posts.erase(connection, {
    postId: post.id,
  });

  // Step 9: Retrieve author karma after deletion
  const karmaAfterDeletion = await api.functional.redditLike.users.karma.at(
    connection,
    {
      userId: author.id,
    },
  );
  typia.assert(karmaAfterDeletion);

  // Step 10: Validate karma preservation after post deletion
  TestValidator.equals(
    "post karma should be preserved after deletion",
    karmaAfterDeletion.post_karma,
    karmaAfterVote.post_karma,
  );

  TestValidator.equals(
    "comment karma should remain unchanged",
    karmaAfterDeletion.comment_karma,
    karmaAfterVote.comment_karma,
  );

  TestValidator.equals(
    "total karma should be preserved after deletion",
    karmaAfterDeletion.total_karma,
    karmaAfterVote.total_karma,
  );
}
