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

export async function test_api_post_vote_unauthenticated_denied(
  connection: api.IConnection,
) {
  /**
   * Verify unauthenticated users cannot set a post vote.
   *
   * Steps:
   *
   * 1. Join as a member user to obtain an authenticated connection.
   * 2. Create a community required for posting content.
   * 3. Create a TEXT post in the created community.
   * 4. Create an unauthenticated connection (empty headers) and attempt to set a
   *    vote — expect error.
   * 5. Retry the same vote with the authenticated connection — expect success;
   *    validate response integrity.
   */

  // 1) Join as a member user (authenticates the SDK connection automatically)
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "Passw0rd!",
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `c_${RandomGenerator.alphaNumeric(10)}`,
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          language: "en",
          region: "US",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          type: "TEXT",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 12,
          }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Create unauthenticated connection and attempt to vote
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot set vote on a post",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.vote.setVote(
        unauthConn,
        {
          postId: post.id,
          body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
        },
      );
    },
  );

  // 5) Authenticated vote should succeed
  const vote =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(vote);

  // Referential integrity and business value checks
  TestValidator.equals(
    "vote is recorded for the correct post",
    vote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("vote value should be +1", vote.value, 1);
}
