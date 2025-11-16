import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Validate that updating a post vote with a non-existent id fails for an
 * authenticated member user.
 *
 * Business intent:
 *
 * - A member user should not be able to update a post vote row that does not
 *   exist in community_platform_post_votes. The backend is expected to return
 *   some form of not-found style error instead of creating a new record
 *   implicitly.
 *
 * Simplified steps based on available APIs:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 * 2. Generate a random UUID to use as a bogus postVoteId that is not tied to any
 *    created vote.
 * 3. Attempt to update this non-existent vote via PUT
 *    /communityPlatform/memberUser/postVotes/{postVoteId} with a valid IUpdate
 *    body.
 * 4. Assert that the update call throws an error rather than returning a normal
 *    ICommunityPlatformPostVote object.
 *
 * Limitations:
 *
 * - We do not have a create/list API for post votes in the provided SDK set, so
 *   we cannot cross-check that no new vote was created or inspect error payload
 *   structure. We only validate that the operation fails for an invalid id
 *   under an authenticated member user.
 */
export async function test_api_post_vote_update_nonexistent_vote_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register (join) a new member user so that subsequent calls are authenticated
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Generate a random UUID that is treated as a non-existent postVoteId
  const nonexistentPostVoteId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid update body for the vote
  const updateBody = {
    vote_value: RandomGenerator.pick([-1, 1] as const),
  } satisfies ICommunityPlatformPostVote.IUpdate;

  // 4. Attempt to update and assert that an error occurs
  await TestValidator.error(
    "updating non-existent post vote should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.update(
        connection,
        {
          postVoteId: nonexistentPostVoteId,
          body: updateBody,
        },
      );
    },
  );
}
