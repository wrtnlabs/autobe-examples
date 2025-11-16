import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate idempotent-like delete behavior for community post types.
 *
 * ## Business goal
 *
 * Ensure that when a platform administrator deletes a post type definition via
 * the platformAdmin API, a subsequent delete attempt against the same
 * identifier no longer succeeds as a normal delete and instead fails with a
 * runtime error, proving that the resource is already gone. This verifies that
 * the delete endpoint is safe to retry and that the system does not
 * accidentally recreate or silently ignore deletion of non-existent post
 * types.
 *
 * ## High-level steps
 *
 * 1. Join a new platform admin account using the platform admin join API. This
 *    will both create the admin row and attach an Authorization header with the
 *    admin’s access token onto the shared connection.
 * 2. As that authenticated platform admin, create a new post type via the
 *    platformAdmin postTypes.create endpoint using a valid
 *    ICommunityPlatformPostType.ICreate payload. Capture the returned
 *    ICommunityPlatformPostType record and assert its shape.
 * 3. Perform the first delete using postTypes.erase with the captured postTypeId.
 *    This call must succeed (i.e., not throw) and return void.
 * 4. Perform a second delete using postTypes.erase for the same postTypeId, this
 *    time expecting an error. Wrap the second call with TestValidator.error to
 *    assert that the API rejects deletion of a post type that has already been
 *    removed.
 *
 * ## Validation strategy
 *
 * - Use typia.assert on the ICommunityPlatformPlatformadmin.IAuthorized response
 *   from join and on the ICommunityPlatformPostType response from create to
 *   validate all structural and type constraints.
 * - Treat the first erase call as a success path and simply await it; any thrown
 *   error would cause the test to fail.
 * - Use TestValidator.error with an async callback for the second erase call to
 *   ensure an error is thrown, without depending on specific HTTP status codes
 *   or error payload shapes.
 * - Rely on the SDK’s automatic token propagation from the join call so that the
 *   create and erase calls run under the platformAdmin actor.
 */
export async function test_api_post_type_delete_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and start an authenticated session
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://console.example.com/admin/register",
    referrer: "https://console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new post type as the authenticated platform admin
  const createBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(postType);

  // 3. First delete: should succeed silently
  await api.functional.communityPlatform.platformAdmin.postTypes.erase(
    connection,
    {
      postTypeId: postType.id,
    },
  );

  // 4. Second delete: expect an error because the post type was already deleted
  await TestValidator.error(
    "second delete on same post type should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.erase(
        connection,
        {
          postTypeId: postType.id,
        },
      );
    },
  );
}
