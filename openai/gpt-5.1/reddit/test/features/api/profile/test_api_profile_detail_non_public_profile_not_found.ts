import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Ensure anonymous access cannot retrieve non-existing/non-public profiles.
 *
 * Business goal:
 *
 * - Validate that GET /communityPlatform/profiles/{handle} does not leak
 *   ICommunityPlatformUserProfile data when the requested handle does not
 *   correspond to a publicly visible profile and the caller is anonymous.
 *
 * Constraints and available APIs:
 *
 * - We can register a member user via POST /auth/memberUser/join
 *   (api.functional.auth.memberUser.join) with
 *   ICommunityPlatformMemberuser.IJoin and receive
 *   ICommunityPlatformMemberuser.IAuthorized (including token).
 * - We can create a community via POST /communityPlatform/memberUser/communities
 *   (api.functional.communityPlatform.memberUser.communities.create) with
 *   ICommunityPlatformCommunity.ICreate and receive
 *   ICommunityPlatformCommunity.
 * - We can read public profiles via GET /communityPlatform/profiles/{handle}
 *   (api.functional.communityPlatform.profiles.at) which returns
 *   ICommunityPlatformUserProfile for public/visible profiles.
 * - We have no mutation API for user profiles (no create/update or flag
 *   toggling), so we cannot explicitly create a profile row or flip
 *   is_profile_public.
 *
 * Practical testing strategy under these constraints:
 *
 * - Treat a clearly non-existent, high-entropy handle as representing a
 *   non-public/unavailable profile from the perspective of an anonymous
 *   caller.
 * - The core invariant we can assert is that an anonymous caller must _not_
 *   successfully obtain ICommunityPlatformUserProfile data for such a handle.
 * - The SDK type for profiles.at returns ICommunityPlatformUserProfile on success
 *   and throws HttpError for non-2xx responses. Therefore, we test the error
 *   path: calling profiles.at with a non-existent handle on an unauthenticated
 *   connection must throw, and must not yield a typed profile object.
 *
 * Test flow:
 *
 * 1. Member join
 *
 *    - Call api.functional.auth.memberUser.join with a random
 *         ICommunityPlatformMemberuser.IJoin payload.
 *    - Assert the returned ICommunityPlatformMemberuser.IAuthorized via typia.assert
 *         to ensure the auth/join pipeline is functioning.
 *    - Purpose: seed a realistic environment and ensure that the member user domain
 *         and sessions are initialized. We _do not_ rely on this user for the
 *         profile handle under test, because we have no visibility/creation
 *         control over profiles.
 * 2. Community creation
 *
 *    - Call api.functional.communityPlatform.memberUser.communities.create with a
 *         random ICommunityPlatformCommunity.ICreate body (slug, name,
 *         description, visibility, status and boolean flags).
 *    - Assert the returned ICommunityPlatformCommunity via typia.assert.
 *    - Purpose: satisfy the dependency that a member-created community exists,
 *         thereby approximating a realistic platform state.
 * 3. Prepare an unauthenticated connection
 *
 *    - Construct a new connection object that clones the original connection but
 *         overrides headers to `{}`. This ensures that no Authorization header
 *         is present and the call is treated as anonymous by the server.
 * 4. Choose a non-existent handle
 *
 *    - Generate a high-entropy random handle string using RandomGenerator and
 *         typia.random so that it is extremely unlikely to match any real
 *         profile handle created by seed data.
 *    - We do _not_ call profiles.at first in an authenticated context, because that
 *         would require the profile to exist and be public. Instead, we
 *         directly use the synthetic handle only in the anonymous call.
 * 5. Attempt to fetch the profile anonymously and expect error
 *
 *    - Use `await TestValidator.error("anonymous non-existing profile must fail",
 *         async () => { ... })`.
 *    - Inside the async callback, call `await
 *         api.functional.communityPlatform.profiles.at(unauthConn, { handle
 *         })`.
 *    - The expected behavior is that this call throws an HttpError, indicating that
 *         the profile is not available to anonymous callers (either due to
 *         non-existence or non-public visibility).
 *    - We intentionally do _not_ inspect the status code (404 vs 403) because the
 *         global testing guidelines forbid explicit HTTP status assertions.
 *         Instead, we only assert that some error is thrown and no
 *         ICommunityPlatformUserProfile object is returned.
 * 6. Additional sanity check (optional but safe)
 *
 *    - As part of the same test, we can verify that the handle string is preserved
 *         correctly when constructing the request path by using
 *         TestValidator.predicate on trivial invariants (e.g., handle length >
 *         0). However, typia.assert on join/create responses already gives
 *         strong confidence on type correctness; we focus mainly on the
 *         business-visible behavior that anonymous access to
 *         non-existing/non-public profiles does not return profile data.
 */
export async function test_api_profile_detail_non_public_profile_not_found(
  connection: api.IConnection,
) {
  // 1. Member join: create a realistic memberUser context.
  const joinInput = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joined: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinInput,
    });
  typia.assert(joined);

  // 2. Community creation under the authenticated memberUser context.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Basic sanity: created community slug and name are non-empty.
  await TestValidator.predicate(
    "created community slug must be non-empty",
    () => community.slug.length > 0,
  );
  await TestValidator.predicate(
    "created community name must be non-empty",
    () => community.name.length > 0,
  );

  // 3. Prepare an unauthenticated connection (no Authorization header) for anonymous call.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Construct a handle that is extremely unlikely to exist.
  const nonExistingHandle: string = `${RandomGenerator.alphaNumeric(24)}_${RandomGenerator.alphaNumeric(24)}`;

  await TestValidator.predicate(
    "non-existing handle must be non-empty",
    () => nonExistingHandle.length > 0,
  );

  // 5. Attempt to fetch the profile anonymously and assert that this fails.
  await TestValidator.error(
    "anonymous access to non-existing/non-public profile must fail",
    async () => {
      await api.functional.communityPlatform.profiles.at(anonymousConnection, {
        handle: nonExistingHandle,
      });
    },
  );
}
