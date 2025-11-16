import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate public profile retrieval by handle for a community platform member.
 *
 * Business intent:
 *
 * - Ensure that a public-facing member profile can be retrieved by its handle
 *   (business identifier) using the public endpoint GET
 *   /communityPlatform/profiles/{handle}.
 * - Confirm this endpoint works without authentication (guest access) and that
 *   the returned payload conforms to ICommunityPlatformUserProfile, including
 *   visibility flags such as is_profile_public.
 * - Exercise a realistic setup where a member user exists and has created at
 *   least one community, matching typical platform preconditions.
 *
 * High-level flow:
 *
 * 1. Register a new memberUser via the join endpoint, getting an authorized
 *    session and capturing the username as the expected profile handle.
 * 2. Create a community as that authenticated member to reflect normal platform
 *    usage (even though the profile endpoint does not require it directly).
 * 3. Create a guest (unauthenticated) connection by cloning the original
 *    connection with empty headers, so no Authorization is sent.
 * 4. Call GET /communityPlatform/profiles/{handle} using the captured username as
 *    the handle and the guest connection.
 * 5. Assert that the response matches ICommunityPlatformUserProfile and that
 *    is_profile_public is true, indicating the profile is publicly visible.
 * 6. Assert that the handle in the profile matches the handle used in the path
 *    (the member's username), validating correct routing.
 */
export async function test_api_profile_detail_public_handle_success(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: `user_${RandomGenerator.alphaNumeric(12)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const handle: string = authorized.username;

  // 2. Create a community as this member user
  const communityCreateBody = {
    slug: `community_${RandomGenerator.alphaNumeric(10)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Prepare a guest (unauthenticated) connection with empty headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Fetch the public profile by handle using the guest connection
  const profile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.profiles.at(guestConnection, {
      handle,
    });
  typia.assert<ICommunityPlatformUserProfile>(profile);

  // 5. Business assertions
  TestValidator.equals(
    "profile handle should match member username (handle)",
    profile.handle,
    handle,
  );

  TestValidator.predicate(
    "profile must be publicly visible (is_profile_public === true)",
    profile.is_profile_public === true,
  );
}
