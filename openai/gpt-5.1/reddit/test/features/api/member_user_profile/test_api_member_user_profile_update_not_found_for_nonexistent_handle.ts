import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate that updating a non-existent member user profile by handle fails
 * with a not-found style error and does not create a new profile.
 *
 * Business context:
 *
 * - Member users edit their public profile via PUT
 *   /communityPlatform/memberUser/profiles/{handle}.
 * - Profiles are uniquely addressed by a public `handle` stored in
 *   community_platform_user_profiles.handle.
 * - The backend must not create a new profile record when an update is issued
 *   against a handle that does not correspond to any active profile; instead it
 *   should behave as a not-found.
 *
 * Test scenario:
 *
 * 1. Register a new member user using POST /auth/memberUser/join, which also
 *    establishes an authenticated session using the returned token bundle.
 * 2. Create at least one community using POST
 *    /communityPlatform/memberUser/communities to exercise normal
 *    memberUser-only flows and ensure the account context is valid. We do not
 *    rely on any implicit profile creation behavior here, only on the fact that
 *    the member user is authenticated and allowed to call profile APIs.
 * 3. Derive a clearly non-existent profile handle string that is highly unlikely
 *    to correspond to any real profile, for example by taking the joined
 *    username and appending a long random suffix or prefix such as
 *    "nonexistent-" plus a random token.
 * 4. Build a syntactically valid ICommunityPlatformUserProfile.IUpdate payload
 *    that exercises several updatable fields (e.g., tagline, bio, avatar_uri,
 *    website_uri, and visibility flags). All values must conform to the
 *    documented formats (URIs for avatar_uri and website_uri, booleans for the
 *    *_karma flags and is_profile_public), but the specific content can be
 *    random test data.
 * 5. Invoke api.functional.communityPlatform.memberUser.profiles.update with the
 *    non-existent handle and the valid update body.
 * 6. Assert that the operation fails using TestValidator.error, treating any
 *    thrown error as sufficient evidence of not-found style behavior from the
 *    perspective of this test. The test must not depend on specific HTTP status
 *    codes or error payload structure.
 * 7. Since there is no read-by-handle index API in the provided SDK, we cannot
 *    directly verify that no profile was created as a side-effect. Instead we
 *    rely on the contract description that this update endpoint only updates
 *    existing community_platform_user_profiles rows and returns 404 when no
 *    active row is found; our error assertion at step 6 is therefore the
 *    observable indicator that no improper creation occurred.
 */
export async function test_api_member_user_profile_update_not_found_for_nonexistent_handle(
  connection: api.IConnection,
) {
  // 1. Register a new member user and establish authenticated session
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join", // valid URI
    referrer: "https://community.example.com/landing", // valid URI
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community to ensure memberUser context is fully operational
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Construct a clearly non-existent profile handle based on the username
  const nonexistentHandlePrefix = "nonexistent-";
  const randomSuffix = RandomGenerator.alphaNumeric(16);
  const nonexistentHandle = `${nonexistentHandlePrefix}${authorized.username}-${randomSuffix}`;

  // 4. Build a valid ICommunityPlatformUserProfile.IUpdate payload
  const updateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.content({ paragraphs: 2 }),
    avatar_uri:
      "https://cdn.example.com/avatars/" + RandomGenerator.alphaNumeric(16),
    website_uri: "https://" + RandomGenerator.alphabets(8) + ".example.com",
    show_total_karma: true,
    show_post_karma: true,
    show_comment_karma: true,
    is_profile_public: true,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  // 5-6. Attempt to update non-existent profile handle and assert error
  await TestValidator.error(
    "update non-existent profile handle should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.profiles.update(
        connection,
        {
          handle: nonexistentHandle,
          body: updateBody,
        },
      );
    },
  );
}
