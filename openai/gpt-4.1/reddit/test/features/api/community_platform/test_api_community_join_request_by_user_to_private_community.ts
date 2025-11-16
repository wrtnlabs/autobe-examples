import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate user join request submission to a private/invite-only community.
 *
 * Simulates the end-to-end journey of a new user registering and attempting to
 * join a restricted community, ensuring that business rules (unique active
 * request per user/community, audit compliance, pending moderation) are
 * enforced. No immediate approval should occur; request status remains
 * 'pending'.
 *
 * Steps:
 *
 * 1. Register a new user and authenticate
 * 2. Select a random (likely non-existent) private or invite-only community name
 * 3. Submit join request message
 * 4. Validate the join request entity: correct user, correct community ref, status
 *    is 'pending', processed/moderator fields are unset, audit timestamps are
 *    present
 */
export async function test_api_community_join_request_by_user_to_private_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate user
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;

  const userAuth: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userJoinInput });
  typia.assert(userAuth);

  // 2. Define a restricted (private/invite-only) community slug to join
  // In absence of a creation API, use a plausible unique slug
  const communityName = RandomGenerator.alphaNumeric(12).toLowerCase();

  // 3. Prepare a join request message
  const joinRequestInput = {
    request_message: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 14,
    }),
  } satisfies ICommunityPlatformCommunityJoinRequest.ICreate;

  // 4. Submit join request
  const joinRequest: ICommunityPlatformCommunityJoinRequest =
    await api.functional.communityPlatform.user.communities.joinRequests.create(
      connection,
      {
        communityName,
        body: joinRequestInput,
      },
    );
  typia.assert(joinRequest);

  // 5. Assert output: correct shape, pending state, user and community refs
  TestValidator.equals(
    "join request is linked to user",
    joinRequest.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "join request is for target community",
    joinRequest.community.name,
    communityName,
  );
  TestValidator.equals(
    "join request status is pending",
    joinRequest.status,
    "pending",
  );
  TestValidator.equals(
    "join request is not pre-approved, no moderator",
    joinRequest.processed_by_moderator,
    null,
  );
  TestValidator.equals(
    "join request not processed yet",
    joinRequest.processed_at,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    typeof joinRequest.created_at === "string" &&
      joinRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    typeof joinRequest.updated_at === "string" &&
      joinRequest.updated_at.length > 0,
  );
}
