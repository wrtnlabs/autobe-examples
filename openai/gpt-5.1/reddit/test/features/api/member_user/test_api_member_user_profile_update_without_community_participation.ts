import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Ensure a freshly joined member user can update profile metadata without any
 * community participation.
 *
 * Business context:
 *
 * - A member user should be able to configure their own profile (display name,
 *   bio, avatar) immediately after registration, before joining or creating any
 *   communities.
 * - The update endpoint must behave like a patch: only provided optional fields
 *   change; unspecified optional fields (like avatarUrl) and immutable core
 *   fields remain unchanged.
 *
 * Workflow:
 *
 * 1. Join as a new memberUser using POST /auth/memberUser/join and obtain
 *    IAuthorized.
 *
 *    - This also configures the Authorization header on the shared connection.
 * 2. Immediately call PUT /communityPlatform/memberUser/memberUsers/{memberUserId}
 *    with only displayName and bio in the ICommunityPlatformMemberuser.IUpdate
 *    body, leaving avatarUrl unspecified to verify patch semantics.
 * 3. Verify that:
 *
 *    - Core identity fields (id, username, email, statusCode, createdAt) remain
 *         unchanged.
 *    - DisplayName and bio are updated to the new values.
 *    - AvatarUrl remains unchanged when omitted from the update body.
 *    - UpdatedAt advances when a previous updatedAt existed.
 */
export async function test_api_member_user_profile_update_without_community_participation(
  connection: api.IConnection,
) {
  // 1. Join as a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // Capture previous profile and account fields from the authorization snapshot
  const prevDisplayName = authorized.displayName;
  const prevBio = authorized.bio;
  const prevAvatarUrl = authorized.avatarUrl;
  const prevStatusCode = authorized.statusCode;
  const prevCreatedAt = authorized.createdAt;
  const prevUpdatedAt = authorized.updatedAt;

  // 2. Prepare partial update with only displayName and bio
  const newDisplayName = RandomGenerator.name(2);
  const newBio = RandomGenerator.paragraph({ sentences: 5 });

  const updateBody = {
    displayName: newDisplayName,
    bio: newBio,
    // avatarUrl intentionally omitted to validate patch behavior
  } satisfies ICommunityPlatformMemberuser.IUpdate;

  const updated: ICommunityPlatformMemberuser =
    await api.functional.communityPlatform.memberUser.memberUsers.update(
      connection,
      {
        memberUserId: authorized.id,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformMemberuser>(updated);

  // 3. Validate identity and account fields remain unchanged
  TestValidator.equals(
    "memberUser id remains unchanged",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "username remains unchanged",
    updated.username,
    authorized.username,
  );
  TestValidator.equals(
    "email remains unchanged",
    updated.email,
    authorized.email,
  );
  TestValidator.equals(
    "statusCode remains unchanged",
    updated.statusCode,
    prevStatusCode,
  );
  TestValidator.equals(
    "createdAt remains unchanged",
    updated.createdAt,
    prevCreatedAt,
  );

  // 4. Validate profile fields changes vs non-changes
  TestValidator.equals(
    "displayName is updated to new value",
    updated.displayName,
    newDisplayName,
  );
  TestValidator.equals("bio is updated to new value", updated.bio, newBio);
  TestValidator.equals(
    "avatarUrl remains unchanged when omitted in update",
    updated.avatarUrl,
    prevAvatarUrl,
  );

  // updatedAt should generally advance; only assert inequality if previous existed
  if (prevUpdatedAt !== undefined) {
    TestValidator.notEquals(
      "updatedAt advances after profile update when previous updatedAt existed",
      updated.updatedAt,
      prevUpdatedAt,
    );
  }
}
