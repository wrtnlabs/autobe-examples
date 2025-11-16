import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Verify that a member user cannot delete another member user's vote on a post.
 *
 * Business workflow:
 *
 * 1. Register memberUser A and obtain an authenticated session.
 * 2. As memberUser A, create a community and a post.
 * 3. As memberUser A, create a vote on that post and capture the resulting voteId
 *    and postId.
 * 4. Switch the authenticated identity to memberUser B via another join call.
 * 5. As memberUser B, attempt to delete A's vote via DELETE
 *    /communityPlatform/memberUser/posts/{postId}/votes/{voteId} and assert
 *    that an error is thrown.
 * 6. Optionally, switch back to a fresh memberUser A identity and call the vote
 *    creation endpoint again for the same post, asserting that the vote still
 *    targets the same post, which demonstrates that the unauthorized delete
 *    attempt did not grant B ownership over A's vote.
 *
 * This validates that ownership enforcement for vote deletion is tied to the
 * authenticated member user and that cross-account deletions are rejected.
 */
export async function test_api_post_vote_delete_ownership_enforced(
  connection: api.IConnection,
) {
  // 1. Register memberUser A (vote owner) and authenticate connection as A
  const memberUserA = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUserA);

  // 2. As A, create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          slug: RandomGenerator.alphabets(12),
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          visibility: "public",
          status: "active",
          is_nsfw: false,
          is_quarantined: false,
          is_posting_restricted: false,
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. As A, create a post in that community
  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 3,
          wordMax: 10,
        }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 4. As A, create a vote on that post
  const voteA =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(voteA);

  TestValidator.equals(
    "vote should target the created post",
    voteA.post_id,
    post.id,
  );

  // 5. Switch connection to act as memberUser B via another join call
  const memberUserB = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMemberuser.IJoin,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUserB);

  // 6. As B, attempt to delete A's vote and expect an authorization/ownership error
  await TestValidator.error(
    "other member user cannot delete another user's vote",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.votes.erase(
        connection,
        {
          postId: voteA.post_id,
          voteId: voteA.id,
        },
      );
    },
  );

  // 7. Optionally, switch back to a fresh memberUser A identity and re-vote
  const memberUserASecond = await api.functional.auth.memberUser.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMemberuser.IJoin,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUserASecond);

  const voteAfterFailure =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          direction: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostVote>(voteAfterFailure);

  TestValidator.equals(
    "post id of vote after unauthorized delete attempt should still match original post",
    voteAfterFailure.post_id,
    post.id,
  );
}
