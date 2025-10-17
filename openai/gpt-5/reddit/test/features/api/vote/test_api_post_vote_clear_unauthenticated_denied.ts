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
 * Deny unauthenticated vote clearing and preserve existing vote state.
 *
 * This scenario ensures that DELETE
 * /communityPlatform/memberUser/posts/{postId}/vote requires authentication and
 * does not alter state when called without credentials. It also verifies that
 * an existing vote remains intact after the denied attempt.
 *
 * Steps:
 *
 * 1. Join as a member (obtain authenticated context).
 * 2. Create a community.
 * 3. Create a TEXT post in that community.
 * 4. Set an active vote (+1) on the post.
 * 5. Attempt to clear the vote using a connection without Authorization → expect
 *    error.
 * 6. Re-set the same vote value (+1) and confirm idempotency and identity
 *    consistency.
 * 7. Optionally switch to -1 to ensure subsequent update still works and keeps the
 *    same id.
 */
export async function test_api_post_vote_clear_unauthenticated_denied(
  connection: api.IConnection,
) {
  // 1) Join as a member (registration issues token and SDK stores it)
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: `user_${RandomGenerator.alphaNumeric(8)}` as string,
      password: "Passw0rd!", // >=8 chars, includes letter & number
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(authorized);

  // 2) Create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `c_${RandomGenerator.alphaNumeric(12)}`,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "TEXT",
          body: RandomGenerator.paragraph({ sentences: 12 }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate.ITEXT,
      },
    );
  typia.assert(post);

  // 4) Set an active vote (+1) on the post
  const voteUp =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(voteUp);
  TestValidator.equals("initial vote value is +1", voteUp.value, 1);

  // 5) Attempt to clear the vote without Authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated erase must be denied",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.vote.erase(
        unauthConn,
        { postId: post.id },
      );
    },
  );

  // 6) Re-set the same vote value (+1) to confirm state was not cleared
  const voteUpAgain =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: 1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(voteUpAgain);
  TestValidator.equals(
    "vote id remains identical after denied unauthenticated erase",
    voteUpAgain.id,
    voteUp.id,
  );
  TestValidator.equals(
    "vote value remains +1 after denied erase",
    voteUpAgain.value,
    1,
  );

  // 7) Optional: switch to -1 and ensure update works and keeps same id
  const voteDown =
    await api.functional.communityPlatform.memberUser.posts.vote.setVote(
      connection,
      {
        postId: post.id,
        body: { value: -1 } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(voteDown);
  TestValidator.equals(
    "vote id unchanged on value update to -1",
    voteDown.id,
    voteUp.id,
  );
  TestValidator.equals("vote value updated to -1", voteDown.value, -1);
}
