import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";

/**
 * Test retrieving posts from a community sorted by Controversial algorithm.
 *
 * This test validates that the Controversial sorting algorithm correctly
 * identifies and ranks polarizing content based on balanced upvote/downvote
 * ratios and total vote volume. The test creates multiple posts with different
 * voting patterns and verifies that posts with near 50/50 vote ratios and
 * higher total votes rank higher.
 *
 * Test workflow:
 *
 * 1. Create multiple member accounts for diverse voting patterns
 * 2. Create a test community for post publishing
 * 3. Create multiple posts with different content
 * 4. Cast balanced upvotes and downvotes to create controversial voting patterns
 * 5. Search posts with Controversial sorting algorithm
 * 6. Validate that controversial posts (balanced votes, high volume) rank first
 * 7. Verify posts with unanimous voting rank lower than balanced voting posts
 */
export async function test_api_community_posts_search_with_controversial_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create multiple member accounts and store their credentials
  const memberCount = 11;
  const memberCredentials: Array<{
    username: string;
    email: string;
    password: string;
  }> = [];

  for (let i = 0; i < memberCount; i++) {
    const credentials = {
      username: `testuser_${RandomGenerator.alphaNumeric(8)}_${i}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    };
    memberCredentials.push(credentials);
  }

  // Register first member who will create the community
  const communityCreator = await api.functional.auth.member.join(connection, {
    body: memberCredentials[0] satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(communityCreator);

  // Step 2: Create community
  const communityData = {
    code: `testcomm_${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 5 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
    }),
    privacy_type: "public",
    allow_text_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    { body: communityData },
  );
  typia.assert(community);

  // Step 3: Create multiple posts with different content
  const postTitles = [
    "Highly Controversial Topic Discussion",
    "Moderately Divisive Opinion",
    "Slightly Polarizing Viewpoint",
    "Universally Agreed Statement",
    "Neutral Observation",
  ];

  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const postData = {
        community_id: community.id,
        type: "text",
        title: postTitles[index],
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
      } satisfies IRedditLikePost.ICreate;

      const post = await api.functional.redditLike.member.posts.create(
        connection,
        { body: postData },
      );
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Register remaining members and cast votes to create controversial patterns
  // Register all voting members first
  for (let i = 1; i < memberCount; i++) {
    const member = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(member);
  }

  // Post 0: High volume, balanced (5 upvotes, 5 downvotes) - Most controversial
  for (let i = 1; i <= 5; i++) {
    const upvoter = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(upvoter);

    const upvoteData = { vote_value: 1 } satisfies IRedditLikePostVote.ICreate;
    const upvote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: posts[0].id,
        body: upvoteData,
      },
    );
    typia.assert(upvote);
  }

  for (let i = 6; i <= 10; i++) {
    const downvoter = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(downvoter);

    const downvoteData = {
      vote_value: -1,
    } satisfies IRedditLikePostVote.ICreate;
    const downvote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: posts[0].id,
        body: downvoteData,
      },
    );
    typia.assert(downvote);
  }

  // Post 1: Medium volume, balanced (3 upvotes, 3 downvotes) - Moderately controversial
  for (let i = 1; i <= 3; i++) {
    const upvoter = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(upvoter);

    const upvoteData = { vote_value: 1 } satisfies IRedditLikePostVote.ICreate;
    const upvote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: posts[1].id,
        body: upvoteData,
      },
    );
    typia.assert(upvote);
  }

  for (let i = 4; i <= 6; i++) {
    const downvoter = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(downvoter);

    const downvoteData = {
      vote_value: -1,
    } satisfies IRedditLikePostVote.ICreate;
    const downvote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: posts[1].id,
        body: downvoteData,
      },
    );
    typia.assert(downvote);
  }

  // Post 2: Low volume, balanced (1 upvote, 1 downvote) - Less controversial
  const post2Upvoter = await api.functional.auth.member.join(connection, {
    body: memberCredentials[1] satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(post2Upvoter);

  const post2UpvoteData = {
    vote_value: 1,
  } satisfies IRedditLikePostVote.ICreate;
  const post2Upvote = await api.functional.redditLike.member.posts.votes.create(
    connection,
    {
      postId: posts[2].id,
      body: post2UpvoteData,
    },
  );
  typia.assert(post2Upvote);

  const post2Downvoter = await api.functional.auth.member.join(connection, {
    body: memberCredentials[2] satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(post2Downvoter);

  const post2DownvoteData = {
    vote_value: -1,
  } satisfies IRedditLikePostVote.ICreate;
  const post2Downvote =
    await api.functional.redditLike.member.posts.votes.create(connection, {
      postId: posts[2].id,
      body: post2DownvoteData,
    });
  typia.assert(post2Downvote);

  // Post 3: High volume, unanimous (6 upvotes, 0 downvotes) - Not controversial
  for (let i = 1; i <= 6; i++) {
    const upvoter = await api.functional.auth.member.join(connection, {
      body: memberCredentials[i] satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(upvoter);

    const upvoteData = { vote_value: 1 } satisfies IRedditLikePostVote.ICreate;
    const upvote = await api.functional.redditLike.member.posts.votes.create(
      connection,
      {
        postId: posts[3].id,
        body: upvoteData,
      },
    );
    typia.assert(upvote);
  }

  // Post 4: No votes (remains unvoted) - Not controversial

  // Step 5: Search posts with Controversial sorting
  const searchRequest = {
    sort_by: "controversial",
    page: 1,
    limit: 10,
  } satisfies IRedditLikeCommunity.IPostSearchRequest;

  const searchResults =
    await api.functional.redditLike.communities.posts.searchPosts(connection, {
      communityId: community.id,
      body: searchRequest,
    });
  typia.assert(searchResults);

  // Step 6: Validate controversial sorting results
  TestValidator.predicate(
    "search results should contain posts",
    searchResults.data.length > 0,
  );

  TestValidator.predicate(
    "all created posts should be in results",
    searchResults.data.length === 5,
  );

  // Most controversial post (high volume, balanced) should rank first
  TestValidator.equals(
    "most controversial post should be first",
    searchResults.data[0].id,
    posts[0].id,
  );

  // Medium controversial post should rank second
  TestValidator.equals(
    "medium controversial post should be second",
    searchResults.data[1].id,
    posts[1].id,
  );

  // Low controversial post should rank third
  TestValidator.equals(
    "low controversial post should be third",
    searchResults.data[2].id,
    posts[2].id,
  );

  // Unanimous post should rank lower than balanced posts
  const unanimousPostIndex = searchResults.data.findIndex(
    (p) => p.id === posts[3].id,
  );
  TestValidator.predicate(
    "unanimous post should rank after controversial posts",
    unanimousPostIndex > 2,
  );

  // No-vote post should rank last or near last
  const noVotePostIndex = searchResults.data.findIndex(
    (p) => p.id === posts[4].id,
  );
  TestValidator.predicate(
    "no-vote post should rank last or near last",
    noVotePostIndex >= 3,
  );
}
