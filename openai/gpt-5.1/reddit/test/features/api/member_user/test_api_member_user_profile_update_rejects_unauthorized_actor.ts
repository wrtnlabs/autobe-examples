import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Verify that only the owning member user can update a profile by handle, and
 * that a different authenticated memberUser actor is rejected.
 *
 * Business context:
 *
 * - Profiles are updated via PUT /communityPlatform/memberUser/profiles/{handle}
 *   using ICommunityPlatformUserProfile.IUpdate payloads.
 * - The endpoint is documented to require a memberUser actor and to enforce that
 *   only the owning member user (or privileged admins) may update a given
 *   handle; other authenticated members must not be able to modify someone
 *   else’s profile.
 *
 * Scenario steps:
 *
 * 1. Register Member A with POST /auth/memberUser/join to establish the first
 *    authenticated memberUser actor (for context only).
 * 2. As Member A, create a community with POST
 *    /communityPlatform/memberUser/communities so that A’s account has
 *    performed at least one community action (not strictly required for
 *    profile, but mirrors real usage).
 * 3. Register Member B with POST /auth/memberUser/join; capture B’s username,
 *    which we treat as the profile handle.
 * 4. As Member B, create a community to ensure B is an active actor.
 * 5. Build a valid ICommunityPlatformUserProfile.IUpdate payload and call PUT
 *    /communityPlatform/memberUser/profiles/{handle} using B’s username as the
 *    handle. Expect success and verify that the returned profile reflects the
 *    updated fields and that handle matches B’s username.
 * 6. Register a third member (Member C) with another POST /auth/memberUser/join
 *    call; this becomes a distinct, authenticated memberUser actor that does
 *    not own B’s profile.
 * 7. As Member C, attempt to call PUT
 *    /communityPlatform/memberUser/profiles/{handle} again with B’s handle and
 *    a valid ICommunityPlatformUserProfile.IUpdate payload. Expect this to fail
 *    with an authorization error (401/403), proving that non-owners cannot
 *    update another member’s profile even when authenticated.
 *
 * Assertions:
 *
 * - Typia.assert() is used on all successful responses (join, community creation,
 *   and successful profile update) to guarantee DTO shape.
 * - After B’s successful update, the returned profile handle equals B’s username
 *   and updated fields match the payload where types allow direct comparison.
 * - For boolean flags, we assert concrete expected values (true/false) via
 *   TestValidator.predicate to avoid union-type mismatches.
 * - TestValidator.httpError is used to assert that Member C’s update attempt
 *   fails with an authorization-related HTTP error.
 */
export async function test_api_member_user_profile_update_rejects_unauthorized_actor(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. As Member A, create a community
  const communityABody = {
    slug: RandomGenerator.alphabets(12),
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

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityABody },
    );
  typia.assert(communityA);

  // 3. Register Member B
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberBHandle: string = memberB.username;

  // 4. As Member B, create a community
  const communityBBody = {
    slug: RandomGenerator.alphabets(12),
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

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBBody },
    );
  typia.assert(communityB);

  // 5. Member B updates their own profile
  const ownerUpdateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    website_uri: typia.random<string & tags.Format<"uri">>(),
    show_total_karma: true,
    show_post_karma: true,
    show_comment_karma: true,
    is_profile_public: true,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const ownerProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle: memberBHandle,
        body: ownerUpdateBody,
      },
    );
  typia.assert(ownerProfile);

  TestValidator.equals(
    "owner profile handle must match member B username",
    ownerProfile.handle,
    memberBHandle,
  );

  TestValidator.equals(
    "owner profile tagline reflects update",
    ownerProfile.tagline,
    ownerUpdateBody.tagline,
  );

  TestValidator.equals(
    "owner profile bio reflects update",
    ownerProfile.bio,
    ownerUpdateBody.bio,
  );

  TestValidator.equals(
    "owner profile avatar_uri reflects update",
    ownerProfile.avatar_uri,
    ownerUpdateBody.avatar_uri,
  );

  TestValidator.equals(
    "owner profile website_uri reflects update",
    ownerProfile.website_uri,
    ownerUpdateBody.website_uri,
  );

  // For boolean flags, directly assert concrete expected values to
  // avoid union-type mismatches between profile DTO and update DTO.
  TestValidator.predicate(
    "owner profile show_total_karma is true after update",
    ownerProfile.show_total_karma === true,
  );

  TestValidator.predicate(
    "owner profile show_post_karma is true after update",
    ownerProfile.show_post_karma === true,
  );

  TestValidator.predicate(
    "owner profile show_comment_karma is true after update",
    ownerProfile.show_comment_karma === true,
  );

  TestValidator.predicate(
    "owner profile is_profile_public is true after update",
    ownerProfile.is_profile_public === true,
  );

  // 6. Register Member C (unauthorized actor)
  const memberCJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberC: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberCJoinBody,
    });
  typia.assert(memberC);

  // 7. As Member C, attempt to update B's profile and expect authorization failure
  const unauthorizedUpdateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    is_profile_public: false,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  await TestValidator.httpError(
    "non-owner member cannot update another user's profile by handle",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.memberUser.profiles.update(
        connection,
        {
          handle: memberBHandle,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
}
