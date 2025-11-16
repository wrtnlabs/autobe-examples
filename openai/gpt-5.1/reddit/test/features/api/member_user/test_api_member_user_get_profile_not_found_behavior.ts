import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate not-found behavior when fetching a member user profile.
 *
 * Business goal: Ensure that GET
 * /communityPlatform/memberUser/memberUsers/{memberUserId} does not return a
 * profile DTO when the requested memberUserId does not correspond to any
 * existing member account, and instead results in an error observable at the
 * HTTP client level.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new member user via POST /auth/memberUser/join to act as
 *    the authenticated caller. This also configures the shared connection with
 *    a valid Authorization token.
 * 2. Sanity-check the happy path by calling GET
 *    /communityPlatform/memberUser/memberUsers/{memberUserId} with the newly
 *    created member's id and asserting that a profile is returned whose id
 *    matches the joined member.
 * 3. Generate a different random UUID that is guaranteed not to equal the joined
 *    member's id, to simulate a non-existent memberUserId.
 * 4. Call the same GET endpoint with this non-existent memberUserId and use
 *    TestValidator.error to assert that the call fails (throws), without
 *    inspecting HTTP status codes or error payloads. This ensures that the API
 *    does not leak any partial profile data for missing users.
 */
export async function test_api_member_user_get_profile_not_found_behavior(
  connection: api.IConnection,
) {
  // 1. Caller joins as a new member user to obtain an authenticated context.
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Sanity check: fetching the profile for the existing memberUserId works.
  const existingProfile: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.at(
      connection,
      {
        memberUserId: authorized.id,
      },
    );
  typia.assert(existingProfile);
  TestValidator.equals(
    "fetched profile id must match joined member user id",
    existingProfile.id,
    authorized.id,
  );

  // 3. Generate a random UUID that is guaranteed to be different from the
  //    existing member user's id to simulate a non-existent memberUserId.
  let nonExistentMemberUserId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== authorized.id) {
      nonExistentMemberUserId = candidate;
      break;
    }
  }

  // 4. Calling GET /communityPlatform/memberUser/memberUsers/{memberUserId}
  //    with a non-existent id must result in an error and must not return a
  //    profile DTO. We only assert that an error is thrown, without inspecting
  //    specific HTTP status codes or payload structure.
  await TestValidator.error(
    "non-existent memberUserId must not return a profile and must throw",
    async () => {
      await api.functional.communityPlatform.memberUser.memberUsers.at(
        connection,
        {
          memberUserId: nonExistentMemberUserId,
        },
      );
    },
  );
}
