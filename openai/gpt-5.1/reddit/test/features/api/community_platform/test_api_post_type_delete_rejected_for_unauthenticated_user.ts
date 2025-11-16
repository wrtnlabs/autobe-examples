import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that unauthenticated callers cannot delete post type definitions via
 * the platform admin DELETE endpoint.
 *
 * Business context: Platform administrators manage global post type definitions
 * in the community_platform_post_types table. Deleting a post type is a
 * privileged operation that must only be permitted for authenticated
 * platformAdmin actors. Any unauthenticated invocation of the delete endpoint
 * must fail without altering the underlying configuration record.
 *
 * Test steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - Build a realistic ICommunityPlatformPlatformadmin.IJoin payload (username,
 *         email, password, displayName, href, referrer).
 *    - Call api.functional.auth.platformAdmin.join and assert the
 *         ICommunityPlatformPlatformadmin.IAuthorized response using
 *         typia.assert.
 *    - Rely on the SDK to store the admin Authorization token in the connection
 *         headers.
 * 2. As this authenticated platform admin, create a new post type via POST
 *    /communityPlatform/platformAdmin/postTypes.
 *
 *    - Construct an ICommunityPlatformPostType.ICreate body with a random code,
 *         name, and description using RandomGenerator utilities.
 *    - Call api.functional.communityPlatform.platformAdmin.postTypes.create and
 *         assert the ICommunityPlatformPostType response via typia.assert.
 *    - Capture the returned postType.id for use as the delete target.
 * 3. Build an unauthenticated connection by shallow-copying the original
 *    connection and overriding headers with an empty object.
 *
 *    - Per rules, do not touch headers on the original authenticated connection any
 *         further; use the new unauthenticated connection only for negative
 *         testing.
 * 4. Attempt to delete the post type using the unauthenticated connection via
 *    DELETE /communityPlatform/platformAdmin/postTypes/{postTypeId}.
 *
 *    - Invoke api.functional.communityPlatform.platformAdmin.postTypes.erase with
 *         the unauthenticated connection and the captured postTypeId.
 *    - Wrap this call in await TestValidator.error with a descriptive title,
 *         asserting that an error is thrown. Do not assert specific HTTP status
 *         codes.
 * 5. Since no read/list endpoint for post types is provided in the SDK, we
 *    interpret the failure of the unauthorized erase call itself as evidence
 *    that the post type has not been deleted by an unauthenticated actor.
 *
 *    - We do not attempt to re-fetch or list post types using non-existent APIs.
 * 6. Throughout the test, avoid any deliberate type errors, avoid touching
 *    connection.headers beyond creating the separate unauthenticated
 *    connection, and ensure every API call is awaited.
 */
export async function test_api_post_type_delete_rejected_for_unauthenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Create a new post type as the authenticated platform admin
  const createPostTypeBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createPostTypeBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(createdPostType);

  // Basic sanity check that an id was returned (business-level assertion)
  await TestValidator.predicate(
    "created post type has a non-empty id",
    () =>
      typeof createdPostType.id === "string" && createdPostType.id.length > 0,
  );

  // 3. Build an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete the post type using the unauthenticated connection
  await TestValidator.error(
    "unauthenticated delete of post type must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.erase(
        unauthenticatedConnection,
        {
          postTypeId: createdPostType.id,
        },
      );
    },
  );

  // 5. We rely on the failure above as evidence that unauthorized callers
  //    cannot delete post types. No further verification is possible without
  //    read/list APIs, so the test ends here.
}
