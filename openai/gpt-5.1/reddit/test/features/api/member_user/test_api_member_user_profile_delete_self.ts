import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a member user can delete their own public profile by handle,
 * and that repeated delete attempts against the same handle result in an error
 * indicating the profile no longer exists.
 *
 * Business flow implemented here:
 *
 * 1. Register a new member user (POST /auth/memberUser/join), which also
 *    establishes the authenticated session and Authorization header via the
 *    SDK. The username from this join step will act as the profile handle.
 * 2. Create a community as that member user (POST
 *    /communityPlatform/memberUser/communities) to ensure that the member
 *    context and related profile usage are initialized.
 * 3. Call DELETE /communityPlatform/memberUser/profiles/{handle} using the
 *    member’s own username as the handle and the established authorization.
 *    This should succeed and return no body.
 * 4. Call DELETE /communityPlatform/memberUser/profiles/{handle} again with the
 *    same handle, expecting an HTTP error (e.g. 404 Not Found) because the
 *    profile has already been removed. We only assert that an error occurs and
 *    do not validate a specific status code.
 *
 * Type safety rules:
 *
 * - Use ICommunityPlatformMemberuser.IJoin for the join request body via
 *   `satisfies` without type assertions.
 * - Use ICommunityPlatformCommunity.ICreate for the community creation body.
 * - Use the authorized response type ICommunityPlatformMemberuser.IAuthorized
 *   from the join call and validate it with typia.assert.
 * - All API calls must be awaited, and we must not touch connection.headers
 *   directly; authentication is handled by the SDK.
 */
export async function test_api_member_user_profile_delete_self(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context (including token)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Let the backend infer IP by omitting ip instead of sending null explicitly
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community owned by this member user
  // Use bounded-length generators to respect MaxLength constraints
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    // name: 1–3 words, each 3–7 characters -> safely under 255 chars
    name: RandomGenerator.name(3),
    // description: a reasonably short paragraph, comfortably under 4000 chars
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Basic sanity check that the community owner is the joined member
  TestValidator.equals(
    "community owner should be the joined member",
    community.owner_memberuser_id,
    member.id,
  );

  // 3. Delete the member's own profile using username as handle
  const handle: string = member.username;

  await api.functional.communityPlatform.memberUser.profiles.erase(connection, {
    handle,
  });

  // 4. Attempt to delete the same profile again and expect an error
  await TestValidator.error(
    "second delete should fail for missing profile",
    async () => {
      await api.functional.communityPlatform.memberUser.profiles.erase(
        connection,
        { handle },
      );
    },
  );
}
