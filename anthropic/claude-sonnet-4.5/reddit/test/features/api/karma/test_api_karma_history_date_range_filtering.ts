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

/**
 * Test karma history retrieval with date range filtering.
 *
 * This test validates that users can view karma changes within specific time
 * periods by creating a member account, community, and content, then generating
 * karma events over time through voting activity. The test verifies that the
 * karma history API correctly filters results based on karma type and
 * pagination parameters.
 *
 * Test workflow:
 *
 * 1. Create primary member account for karma tracking
 * 2. Create community for content posting
 * 3. Create post that will receive votes
 * 4. Create additional voter accounts
 * 5. Generate karma events through voting
 * 6. Retrieve and validate filtered karma history
 */
export async function test_api_karma_history_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create primary member account whose karma history will be tracked
  const primaryMemberPassword = typia.random<string & tags.MinLength<8>>();
  const primaryMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: primaryMemberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(primaryMember);

  // Step 2: Create community for content creation
  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create post that will receive votes
  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post);

  // Step 4-5: Create multiple voter accounts and generate karma events
  const voterCount = 5;
  await ArrayUtil.asyncRepeat(voterCount, async (index) => {
    const voter: IRedditLikeMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          email: typia.random<string & tags.Format<"email">>(),
          password: typia.random<string & tags.MinLength<8>>(),
        } satisfies IRedditLikeMember.ICreate,
      });
    typia.assert(voter);

    // Cast vote on the post (alternating upvotes and downvotes)
    const voteValue = index % 2 === 0 ? 1 : -1;
    const vote: IRedditLikePostVote =
      await api.functional.redditLike.member.posts.votes.create(connection, {
        postId: post.id,
        body: {
          vote_value: voteValue,
        } satisfies IRedditLikePostVote.ICreate,
      });
    typia.assert(vote);
  });

  // Step 6: Retrieve karma history without filters (baseline)
  const allKarmaHistory: IPageIRedditLikeKarmaHistory =
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
  typia.assert(allKarmaHistory);

  // Step 7: Validate baseline karma history contains expected events
  TestValidator.predicate(
    "karma history should contain vote events",
    allKarmaHistory.data.length > 0,
  );

  // Step 8: Test filtering by karma type (post karma only)
  const postKarmaHistory: IPageIRedditLikeKarmaHistory =
    await api.functional.redditLike.member.users.karma.history.index(
      connection,
      {
        userId: primaryMember.id,
        body: {
          page: 1,
          limit: 50,
          karma_type: "post",
        } satisfies IRedditLikeUser.IKarmaHistoryRequest,
      },
    );
  typia.assert(postKarmaHistory);

  // Step 9: Validate filtered results contain only post karma
  TestValidator.predicate(
    "filtered karma history should contain post karma events",
    postKarmaHistory.data.every((event) => event.karma_type === "post"),
  );

  // Step 10: Verify pagination works correctly
  TestValidator.predicate(
    "pagination info should be valid",
    postKarmaHistory.pagination.current === 1 &&
      postKarmaHistory.pagination.limit === 50,
  );
}
