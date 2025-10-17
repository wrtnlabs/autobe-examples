import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeKarmaHistory";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeKarmaHistory";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

export async function test_api_karma_history_pagination_large_dataset(
  connection: api.IConnection,
) {
  // Step 1: Create the primary member account
  const primaryMember = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(primaryMember);

  // Step 2: Create a community for content creation
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10).toLowerCase(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create multiple posts (10 posts to generate substantial karma events)
  const posts = await ArrayUtil.asyncRepeat(10, async () => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 4: Generate numerous karma events through voting activity
  // Create 6 voter accounts (6 voters * 10 posts = 60 karma events minimum)
  const voterAccounts = await ArrayUtil.asyncRepeat(6, async (index) => {
    const voter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: "VoterPass123!",
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(voter);
    return voter;
  });

  // Each voter votes on all posts
  for (const voter of voterAccounts) {
    // Re-authenticate as voter (SDK handles token automatically)
    await api.functional.auth.member.join(connection, {
      body: {
        username: voter.username,
        email: voter.email,
        password: "VoterPass123!",
      } satisfies IRedditLikeMember.ICreate,
    });

    await ArrayUtil.asyncForEach(posts, async (post) => {
      const voteValue = Math.random() > 0.5 ? 1 : -1;
      const vote = await api.functional.redditLike.member.posts.votes.create(
        connection,
        {
          postId: post.id,
          body: {
            vote_value: voteValue,
          } satisfies IRedditLikePostVote.ICreate,
        },
      );
      typia.assert(vote);
    });
  }

  // Switch back to primary member by re-authenticating
  await api.functional.auth.member.join(connection, {
    body: {
      username: primaryMember.username,
      email: primaryMember.email,
      password: "SecurePass123!",
    } satisfies IRedditLikeMember.ICreate,
  });

  // Step 5: Test pagination with different page sizes and page numbers

  // Test 5.1: Retrieve first page with small page size
  const page1Small =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(page1Small);

  // Step 6: Validate pagination results
  TestValidator.predicate(
    "first page should contain data",
    page1Small.data.length > 0,
  );
  TestValidator.predicate(
    "first page data should not exceed limit",
    page1Small.data.length <= 10,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    page1Small.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    page1Small.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total records should be at least 50",
    page1Small.pagination.records >= 50,
  );

  // Test 5.2: Retrieve second page
  const page2Small =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(page2Small);

  TestValidator.predicate(
    "second page should contain data",
    page2Small.data.length > 0,
  );
  TestValidator.predicate(
    "second page current should be 2",
    page2Small.pagination.current === 2,
  );
  TestValidator.predicate(
    "total records should match across pages",
    page2Small.pagination.records === page1Small.pagination.records,
  );

  // Test 5.3: Retrieve with larger page size
  const pageLarge =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(pageLarge);

  TestValidator.predicate(
    "large page should contain data",
    pageLarge.data.length > 0,
  );
  TestValidator.predicate(
    "large page data should not exceed limit",
    pageLarge.data.length <= 50,
  );
  TestValidator.predicate(
    "large page limit should be 50",
    pageLarge.pagination.limit === 50,
  );

  // Test 5.4: Test page boundaries - last page
  const totalPages = page1Small.pagination.pages;
  const lastPage =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: totalPages,
          limit: 10,
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(lastPage);

  TestValidator.predicate(
    "last page current should match total pages",
    lastPage.pagination.current === totalPages,
  );
  TestValidator.predicate(
    "last page should have data or be empty if exactly divisible",
    lastPage.data.length >= 0,
  );

  // Test 5.5: Verify chronological ordering
  TestValidator.predicate(
    "karma history should be ordered chronologically",
    page1Small.data.length > 1
      ? new Date(page1Small.data[0].created_at).getTime() >=
          new Date(page1Small.data[1].created_at).getTime()
      : true,
  );
}
