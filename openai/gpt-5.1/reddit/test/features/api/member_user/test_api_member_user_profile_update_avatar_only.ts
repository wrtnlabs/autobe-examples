import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a member user can update only their avatarUrl using the profile
 * update endpoint, and that other profile fields remain unchanged.
 *
 * Business context:
 *
 * - Member users register via /auth/memberUser/join, which returns an
 *   ICommunityPlatformMemberuser.IAuthorized envelope and establishes
 *   authentication context for subsequent calls.
 * - The profile update endpoint PUT
 *   /communityPlatform/memberUser/memberUsers/{memberUserId} accepts
 *   ICommunityPlatformMemberuser.IUpdate as a partial patch DTO, where all
 *   fields are optional and only supplied fields should be modified.
 * - This test focuses on the minimal-case update: only avatarUrl is provided, so
 *   displayName and bio must not be altered.
 *
 * Test steps:
 *
 * 1. Join as a new member user using api.functional.auth.memberUser.join with a
 *    realistic IJoinRequest, capturing the returned authorized envelope
 *    (ICommunityPlatformMemberuser.IAuthorized).
 * 2. Record the initial displayName, bio, and avatarUrl from the authorized
 *    payload for later comparison.
 * 3. Generate a realistic avatar image URL (string & tags.Format<"uri">) using
 *    typia.random and/or simple composition.
 * 4. Call api.functional.communityPlatform.memberUser.memberUsers.update with
 *    memberUserId set to the authorized.id, and body containing only avatarUrl
 *    per ICommunityPlatformMemberuser.IUpdate.
 * 5. Assert that:
 *
 *    - The operation succeeds and returns ICommunityPlatformMemberuser.
 *    - Typia.assert validates the structural correctness of the response.
 *    - Response.id equals authorized.id.
 *    - Response.avatarUrl equals the new URL.
 *    - Response.displayName remains equal to the original displayName (both
 *         undefined or same string).
 *    - Response.bio remains equal to the original bio.
 * 6. As a proxy for “persistence”, rely on the update response itself, since no
 *    dedicated GET endpoint for member user detail is available in the provided
 *    SDK list.
 */
export async function test_api_member_user_profile_update_avatar_only(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-" + RandomGenerator.alphaNumeric(8),
    href: "https://community.example.com/join", // valid URI string
    referrer: "https://community.example.com/landing", // valid URI string
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // Capture initial profile fields
  const initialDisplayName = authorized.displayName;
  const initialBio = authorized.bio;
  const initialAvatarUrl = authorized.avatarUrl;

  // 2. Generate a new realistic avatar URL
  const newAvatarUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // 3. Perform minimal profile update with only avatarUrl
  const updateBody = {
    avatarUrl: newAvatarUrl,
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updated =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        memberUserId: authorized.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Business validations
  // Ensure we updated the same member user
  TestValidator.equals(
    "updated member id matches authorized id",
    updated.id,
    authorized.id,
  );

  // Avatar URL must be updated to the new value
  TestValidator.equals(
    "avatarUrl is updated to the new value",
    updated.avatarUrl,
    newAvatarUrl,
  );

  // displayName and bio must remain unchanged (undefined or same values)
  TestValidator.equals(
    "displayName remains unchanged when only avatarUrl is updated",
    updated.displayName,
    initialDisplayName ?? undefined,
  );
  TestValidator.equals(
    "bio remains unchanged when only avatarUrl is updated",
    updated.bio,
    initialBio ?? undefined,
  );

  // Sanity checks for other immutable/structural fields
  TestValidator.equals(
    "username remains consistent after avatar-only update",
    updated.username,
    authorized.username,
  );
  TestValidator.equals(
    "email remains consistent after avatar-only update",
    updated.email,
    authorized.email,
  );

  // Ensure accountStatus and statusCode are still present and logically consistent
  // typia.assert already guarantees structure; here we just assert non-nullish semantics
  TestValidator.predicate(
    "statusCode is a non-empty string",
    typeof updated.statusCode === "string" && updated.statusCode.length > 0,
  );
  TestValidator.predicate(
    "accountStatus key is a non-empty string",
    typeof updated.accountStatus.key === "string" &&
      updated.accountStatus.key.length > 0,
  );
}
