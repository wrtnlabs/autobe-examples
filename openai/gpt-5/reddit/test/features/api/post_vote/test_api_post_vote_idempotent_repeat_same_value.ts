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
 * Idempotent voting: repeating the same vote value on a post keeps state
 * stable.
 *
 * Flow:
 *
 * 1. Join as a member user (SDK manages auth token).
 * 2. Create a community with valid visibility and archive policy.
 * 3. Create a TEXT post within the community.
 * 4. PUT vote with value=+1 and validate response.
 * 5. Repeat PUT vote with value=+1 and validate idempotency:
 *
 *    - Same vote id (no duplication)
 *    - Value remains +1
 *    - Created_at unchanged
 *    - Updated_at does not regress (equal or later)
 */
export async function test_api_post_vote_idempotent_repeat_same_value(
  connection: api.IConnection,
) {
  // 1) Join as member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: `${RandomGenerator.alphabets(6)}A1`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const me: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(me);

  // 2) Create a community
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4) First vote: value = +1
  const vote1Body = { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate;
  const vote1: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      { postId: post.id, body: vote1Body },
    );
  typia.assert(vote1);

  // Validate first vote
  TestValidator.equals(
    "first vote linked post id matches",
    vote1.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("first vote value is +1", vote1.value, 1);

  // 5) Second vote with the same value = +1 (idempotent)
  const vote2Body = { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate;
  const vote2: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      { postId: post.id, body: vote2Body },
    );
  typia.assert(vote2);

  // Validate idempotency
  TestValidator.equals("idempotent vote keeps same id", vote2.id, vote1.id);
  TestValidator.equals("idempotent vote keeps value +1", vote2.value, 1);
  TestValidator.equals(
    "idempotent vote keeps created_at",
    vote2.created_at,
    vote1.created_at,
  );
  await TestValidator.predicate(
    "updated_at does not regress (>= first call)",
    async () => Date.parse(vote2.updated_at) >= Date.parse(vote1.updated_at),
  );

  // Referential integrity still intact on second response
  TestValidator.equals(
    "second vote linked post id matches",
    vote2.community_platform_post_id,
    post.id,
  );
}
