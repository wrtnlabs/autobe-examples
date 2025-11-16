import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Verify 404 behavior for profile detail when requesting an unknown handle.
 *
 * Business purpose:
 *
 * - Ensure that GET /communityPlatform/profiles/{handle} does not return a
 *   successful profile for a handle that does not exist in the system.
 * - Confirm that the endpoint responds with an HTTP 404 Not Found (via HttpError)
 *   for non-existent handles, even in an environment where member users and
 *   communities already exist.
 * - Validate that anonymous (guest) callers receive the same 404 behavior when
 *   querying an unknown handle, without leaking any profile data.
 *
 * Test flow:
 *
 * 1. Join a new member user (POST /auth/memberUser/join) to create a realistic
 *    authenticated context and to allow the creation of a community.
 * 2. Create a community as that member user (POST
 *    /communityPlatform/memberUser/communities) to satisfy the documented
 *    prerequisite that communities exist in the platform.
 * 3. Derive a guest (unauthenticated) connection from the given connection by
 *    cloning it with empty headers so that no Authorization token is present.
 * 4. Build a handle string that is extremely unlikely to exist by combining a
 *    fixed test prefix with a long random alpha-numeric suffix.
 * 5. Call GET /communityPlatform/profiles/{handle} using the guest connection and
 *    this unknown handle.
 * 6. Use TestValidator.httpError to assert that the call fails with a 404 status
 *    code, indicating not-found behavior.
 *
 * Notes:
 *
 * - The test does not attempt to inspect the error body shape beyond the status
 *   code, because no explicit error DTO is provided.
 * - No profile with the generated handle is ever created, so a 404 is the only
 *   correct outcome.
 * - All request bodies are built with `satisfies` against the proper DTO variants
 *   (IJoin and ICreate) to maintain strict type safety.
 */
export async function test_api_profile_detail_unknown_handle_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new member user to create an authenticated memberUser context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.test/join",
    referrer: "https://community.example.test/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a community using the authenticated memberUser.
  const communityBody = {
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create an unauthenticated (guest) connection by clearing headers.
  //    Per rules, we only set headers once during construction and never
  //    mutate them afterwards.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Generate a non-existent profile handle using a fixed prefix and
  //    a long random suffix to minimize collision chances.
  const unknownHandlePrefix = "__e2e_unknown_handle__";
  const unknownHandle = `${unknownHandlePrefix}${RandomGenerator.alphaNumeric(32)}`;

  // 5. Invoke the profile detail endpoint with the unknown handle and
  //    assert that a 404 HttpError is thrown.
  await TestValidator.httpError(
    "unknown profile handle returns 404 not found",
    404,
    async () => {
      await api.functional.communityPlatform.profiles.at(guestConnection, {
        handle: unknownHandle,
      });
    },
  );
}
