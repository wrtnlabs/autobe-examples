import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that requesting a post type detail with an unknown UUID results in
 * an error instead of a successful ICommunityPlatformPostType payload.
 *
 * Business purpose:
 *
 * - Ensure that /communityPlatform/platformAdmin/postTypes/{postTypeId} enforces
 *   existence checks on the primary key.
 * - Confirm that missing records are surfaced as errors (not-found style) rather
 *   than returning a misleading success response or empty object.
 * - Verify this behavior occurs under proper platformAdmin authentication so that
 *   authorization is not the cause of failure.
 *
 * High-level steps:
 *
 * 1. Join as a platform administrator via /auth/platformAdmin/join to establish an
 *    authenticated session with JWT tokens managed by the SDK.
 * 2. Optionally create a valid post type via POST
 *    /communityPlatform/platformAdmin/postTypes to prove the system works and
 *    that postType detail can succeed for real IDs (though we do not use those
 *    IDs in the not-found check).
 * 3. Generate a random UUID to act as an unknown postTypeId.
 * 4. Call GET /communityPlatform/platformAdmin/postTypes/{postTypeId} with this
 *    unknown id.
 * 5. Assert that the call fails with an error (using TestValidator.error), thereby
 *    ensuring the endpoint does not return an ICommunityPlatformPostType for
 *    nonexistent identifiers.
 */
export async function test_api_post_type_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as platform administrator to obtain an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Optionally create a valid post type to ensure the system is working
  const createBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPostType);

  // 3. Generate a random UUID intended not to match any existing post type.
  //    We do not attempt to guarantee non-collision beyond randomness.
  const unknownPostTypeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Guard against the (extremely unlikely) situation where the random UUID
  // equals the created post type's id by regenerating once if they match.
  // This is purely a logical safeguard and keeps types intact.
  const effectiveUnknownPostTypeId: string & tags.Format<"uuid"> =
    unknownPostTypeId === createdPostType.id
      ? typia.random<string & tags.Format<"uuid">>()
      : unknownPostTypeId;

  // 4 & 5. Attempt to fetch the post type by the unknown UUID and assert
  // that an error is thrown instead of receiving a normal payload.
  await TestValidator.error(
    "requesting post type detail with unknown id should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.at(
        connection,
        {
          postTypeId: effectiveUnknownPostTypeId,
        },
      );
    },
  );
}
