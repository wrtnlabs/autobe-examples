import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Clear an existing comment vote and validate idempotency.
 *
 * Steps:
 *
 * 1. Register Author (member user B) – will author content.
 * 2. Author creates a Community.
 * 3. Author creates a TEXT Post in that Community.
 * 4. Author creates a Comment under the Post.
 * 5. Register Voter (member user A) – connection switches to A for voting.
 * 6. Voter sets an upvote (+1) on the comment via PUT.
 * 7. Voter clears the vote via DELETE.
 * 8. Repeat DELETE to confirm idempotency (should succeed again with no effect).
 * 9. Negative case: Unauthenticated DELETE should error.
 */
export async function test_api_comment_vote_clear_success_and_idempotent(
  connection: api.IConnection,
) {
  // 1) Register Author (member user B)
  const authorJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(1) + RandomGenerator.alphaNumeric(7),
      password: (() => {
        // Ensure at least one letter and one number to satisfy the pattern
        const letter = RandomGenerator.alphabets(1);
        const digit = RandomGenerator.pick([
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
        ]);
        return `${letter}${digit}${RandomGenerator.alphaNumeric(8)}`;
      })(),
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(authorJoin);

  // 2) Author creates a Community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `c_${RandomGenerator.alphaNumeric(10)}`,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibility: "public",
          nsfw: false,
          auto_archive_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30>
          >(),
          language: "en",
          region: "KR",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Author creates a TEXT Post in that Community
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "TEXT",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
            wordMin: 3,
            wordMax: 10,
          }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate.ITEXT,
      },
    );
  typia.assert(post);

  // 4) Author creates a Comment under the Post
  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 12 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Register Voter (member user A) – connection switches to A (token set by SDK)
  const voterJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(1) + RandomGenerator.alphaNumeric(7),
      password: (() => {
        const letter = RandomGenerator.alphabets(1);
        const digit = RandomGenerator.pick([
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
        ]);
        return `${letter}${digit}${RandomGenerator.alphaNumeric(8)}`;
      })(),
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(voterJoin);

  // 6) Voter sets an upvote (+1) on the comment
  const vote =
    await api.functional.communityPlatform.memberUser.comments.vote.update(
      connection,
      {
        commentId: comment.id,
        body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "vote is linked to the target comment",
    vote.community_platform_comment_id,
    comment.id,
  );
  TestValidator.equals("vote value is +1", vote.value, 1);

  // 7) Voter clears the vote
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );

  // 8) Repeat DELETE to confirm idempotency
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );

  // 9) Negative: Unauthenticated DELETE should raise an error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot clear a vote",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.erase(
        unauthConn,
        { commentId: comment.id },
      );
    },
  );
}
