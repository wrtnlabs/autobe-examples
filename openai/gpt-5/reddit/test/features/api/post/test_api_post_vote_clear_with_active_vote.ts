import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Clear an active post vote and verify idempotency.
 *
 * This test validates that:
 *
 * 1. An authenticated member can set an active vote on a post
 * 2. DELETE /communityPlatform/memberUser/posts/{postId}/vote clears the vote
 * 3. Repeating DELETE remains idempotent (still succeeds, no change required)
 * 4. After clearing, a vote can be set again via PUT
 *
 * Business workflow:
 *
 * - Join as a member
 * - Create a community
 * - Create a TEXT post
 * - Set an upvote via PUT
 * - Clear it via DELETE
 * - Call DELETE once more to assert idempotency
 * - Re-set a downvote via PUT to verify reactivation
 */
export async function test_api_post_vote_clear_with_active_vote(
  connection: api.IConnection,
) {
  // 1) Join as member (SDK injects token automatically)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: `A1${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: RandomGenerator.pick([true, false] as const),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const me = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(me);

  // 2) Create a community
  const communityBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    visibility: RandomGenerator.pick([
      "public",
      "restricted",
      "private",
    ] as const),
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "KR",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 12,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to the created community",
    post.community_platform_community_id,
    community.id,
  );

  // 4) Set an active vote via PUT with value=+1
  const upvote =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("vote set to upvote (+1)", upvote.value, 1);
  TestValidator.equals(
    "vote is linked to the target post",
    upvote.community_platform_post_id,
    post.id,
  );

  // 5) DELETE vote — clears the active vote (no response body expected)
  await api.functional.communityPlatform.memberUser.posts.vote.erase(
    connection,
    { postId: post.id },
  );

  // 6) DELETE again — must be idempotent (still succeeds, no change)
  await api.functional.communityPlatform.memberUser.posts.vote.erase(
    connection,
    { postId: post.id },
  );

  // 7) Re-set a vote to verify it can be activated after clearing
  const downvote =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: -1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("vote set to downvote (-1)", downvote.value, -1);
  TestValidator.equals(
    "reactivated vote is linked to the target post",
    downvote.community_platform_post_id,
    post.id,
  );
}
