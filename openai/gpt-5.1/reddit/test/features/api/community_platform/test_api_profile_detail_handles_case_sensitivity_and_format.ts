import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate profile detail retrieval by handle, focusing on handle casing and
 * format.
 *
 * Business context:
 *
 * - Member users register via /auth/memberUser/join and can create communities
 *   via /communityPlatform/memberUser/communities.
 * - Public profiles are fetched via GET /communityPlatform/profiles/{handle}
 *   using a globally unique `handle` string.
 *
 * This test exercises a realistic flow that reaches the public profile detail
 * endpoint and then probes handle case behavior in a way that is compatible
 * with the available APIs and constraints (no direct status-code assertions, no
 * profile creation API, and strict type safety).
 *
 * High‑level steps:
 *
 * 1. Register a new member user (join) and obtain an authenticated session.
 * 2. Create a community as that member user to satisfy prerequisite context that
 *    at least one member-created community exists.
 * 3. Generate a mixed‑case profile handle candidate string.
 * 4. Call GET /communityPlatform/profiles/{handle} with the mixed‑case handle and
 *    assert that the response is a valid ICommunityPlatformUserProfile and that
 *    `profile.handle` echoes the requested handle exactly.
 * 5. Derive a second handle variant that differs only by letter casing and call
 *    the same endpoint again, asserting that the returned
 *    `profileVariant.handle` echoes the second requested handle exactly.
 * 6. Compare the two handle strings to verify that the API preserves the requested
 *    handle casing in each response, regardless of whether the backend treats
 *    handles as case‑sensitive or case‑insensitive for uniqueness/resolution.
 */
export async function test_api_profile_detail_handles_case_sensitivity_and_format(
  connection: api.IConnection,
) {
  // 1. Register a new member user via /auth/memberUser/join
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a community as this member user to match prerequisite context
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Generate a mixed‑case handle string to test case behavior.
  const baseLower = RandomGenerator.alphabets(10); // lowercase a‑z
  // Flip casing on alternating characters to build a mixed‑case handle
  const mixedHandleChars: string[] = [];
  for (let i = 0; i < baseLower.length; i++) {
    const ch = baseLower[i];
    mixedHandleChars.push(i % 2 === 0 ? ch.toUpperCase() : ch);
  }
  const mixedHandle = mixedHandleChars.join("");

  // 4. Call GET /communityPlatform/profiles/{handle} with the mixed‑case handle
  const profile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.profiles.at(connection, {
      handle: mixedHandle,
    });
  typia.assert(profile);

  // Assert that the profile echoes the requested handle exactly.
  TestValidator.equals(
    "profile.handle should match the mixed‑case handle input",
    profile.handle,
    mixedHandle,
  );

  // 5. Derive a case‑variant handle (e.g., fully lower‑cased version)
  const lowerHandle = mixedHandle.toLowerCase();

  const profileLower: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.profiles.at(connection, {
      handle: lowerHandle,
    });
  typia.assert(profileLower);

  TestValidator.equals(
    "profileLower.handle should match the lower‑case handle input",
    profileLower.handle,
    lowerHandle,
  );

  // 6. Compare the two handles to ensure the API preserves requested casing
  TestValidator.notEquals(
    "mixed and lower handles differ when original contained uppercase characters",
    mixedHandle,
    lowerHandle,
  );
}
