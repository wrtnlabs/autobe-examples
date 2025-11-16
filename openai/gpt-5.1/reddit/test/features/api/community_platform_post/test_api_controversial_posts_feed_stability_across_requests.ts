import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Validate deterministic behavior of post voting as a building block for
 * controversial feed stability.
 *
 * Business intent
 *
 * - Even though the SDK for the controversial feed endpoint is not available, we
 *   can still verify that the lower-level vote mechanics that feed any
 *   controversial ranking are deterministic and stable.
 * - Specifically, we validate that:
 *
 *   - Casting a vote for a given (memberUser, post) pair creates a stable vote
 *       record.
 *   - Re-issuing the same vote direction is idempotent and yields a consistent
 *       state.
 *   - Changing the vote direction deterministically updates the vote record
 *       (direction and updated_at) while preserving its identity.
 *   - After reaching a final vote configuration, repeated creations with the same
 *       direction keep the state stable.
 *
 * Scenario outline
 *
 * 1. Join as a member user, which also yields an authenticated session.
 * 2. Create a community to contain test posts.
 * 3. Create two posts within that community.
 * 4. For the first post, cast an upvote from the authenticated member user.
 *
 *    - Call the vote API twice with the same direction "up".
 *    - Assert that the returned vote has the same id and direction across the
 *         repeated calls (idempotent behavior).
 * 5. Change the direction to "down" for the same post.
 *
 *    - Assert that the vote id is stable but the direction changes to "down" and
 *         updated_at moves forward.
 * 6. For the second post, alternate directions (up → down → up) and confirm that
 *    the final state is deterministic and that repeated calls with the same
 *    final direction do not introduce randomness.
 *
 * This test exercises the deterministic foundation that a controversial feed
 * implementation would rely on, while staying within the set of available SDK
 * functions.
 */
export async function test_api_controversial_posts_feed_stability_across_requests(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain an authenticated session.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community owned by this member.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create two posts in the community.
  const createPost = async (
    titleSeed: string,
  ): Promise<ICommunityPlatformPost> => {
    const postBody = {
      communityId: community.id,
      communityCode: community.slug,
      title: `${titleSeed} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 3,
        wordMax: 8,
      }),
      url: undefined,
      postType: "text",
    } satisfies ICommunityPlatformPost.ICreate;

    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body: postBody },
      );
    typia.assert(post);
    return post;
  };

  const firstPost = await createPost("First post for stability testing");
  const secondPost = await createPost("Second post for stability testing");

  // Helper to cast a vote and return the resulting vote entity.
  const castVote = async (
    postId: string & tags.Format<"uuid">,
    direction: string,
  ): Promise<ICommunityPlatformPostVote> => {
    const voteBody = {
      direction,
    } satisfies ICommunityPlatformPostVote.ICreate;

    const vote: ICommunityPlatformPostVote =
      await api.functional.communityPlatform.memberUser.posts.votes.create(
        connection,
        {
          postId,
          body: voteBody,
        },
      );
    typia.assert(vote);
    return vote;
  };

  // 4. For the first post, verify idempotent behavior for repeated identical
  // votes and deterministic update when changing direction.

  // 4-1. Initial upvote.
  const firstUpvote = await castVote(firstPost.id, "up");

  // 4-2. Repeat the same upvote.
  const secondUpvote = await castVote(firstPost.id, "up");

  // Vote id and direction should be stable across identical votes.
  TestValidator.equals(
    "first post vote id should remain stable across identical upvotes",
    secondUpvote.id,
    firstUpvote.id,
  );
  TestValidator.equals(
    "first post vote direction should remain 'up' across identical upvotes",
    secondUpvote.direction,
    firstUpvote.direction,
  );

  // 4-3. Change the direction to down.
  const downvote = await castVote(firstPost.id, "down");

  // The same logical vote should preserve id but change direction and
  // typically update the updated_at timestamp.
  TestValidator.equals(
    "first post vote id should remain stable when changing direction",
    downvote.id,
    firstUpvote.id,
  );
  TestValidator.equals(
    "first post vote direction should change to 'down' after direction update",
    downvote.direction,
    "down",
  );

  TestValidator.predicate(
    "first post vote updated_at should be >= created_at after direction change",
    new Date(downvote.updated_at).getTime() >=
      new Date(downvote.created_at).getTime(),
  );

  // 4-4. Re-cast downvote and ensure stability.
  const repeatedDownvote = await castVote(firstPost.id, "down");

  TestValidator.equals(
    "first post vote id should remain stable across repeated downvotes",
    repeatedDownvote.id,
    downvote.id,
  );
  TestValidator.equals(
    "first post vote direction should remain 'down' across repeated downvotes",
    repeatedDownvote.direction,
    downvote.direction,
  );

  // 5. For the second post, alternate directions and confirm final state is
  // deterministic and stable.

  // 5-1. Upvote → downvote → upvote sequence.
  const secondPostUp1 = await castVote(secondPost.id, "up");
  const secondPostDown = await castVote(secondPost.id, "down");
  const secondPostUp2 = await castVote(secondPost.id, "up");

  // All actions should reference the same vote id.
  TestValidator.equals(
    "second post vote id should remain stable across multiple direction changes",
    secondPostUp2.id,
    secondPostUp1.id,
  );
  TestValidator.equals(
    "second post vote id should also match the downvote in the middle",
    secondPostDown.id,
    secondPostUp1.id,
  );

  // Final direction must be 'up'.
  TestValidator.equals(
    "second post final vote direction should be 'up' after up→down→up sequence",
    secondPostUp2.direction,
    "up",
  );

  // 5-2. Repeat the final 'up' vote and confirm stability.
  const secondPostUp3 = await castVote(secondPost.id, "up");

  TestValidator.equals(
    "second post vote id should remain stable across repeated final upvotes",
    secondPostUp3.id,
    secondPostUp2.id,
  );
  TestValidator.equals(
    "second post vote direction should remain 'up' across repeated final upvotes",
    secondPostUp3.direction,
    secondPostUp2.direction,
  );
}
