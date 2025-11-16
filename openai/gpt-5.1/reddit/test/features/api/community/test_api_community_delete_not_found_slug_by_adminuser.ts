import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

export async function test_api_community_delete_not_found_slug_by_adminuser(
  connection: api.IConnection,
) {
  /**
   * Validate that deleting a community by a non-existent slug as an
   * authenticated adminUser fails with an HTTP error (not-found or equivalent),
   * ensuring that the API does not treat unknown slugs as successful
   * deletions.
   *
   * Business flow implemented in this test:
   *
   * 1. Register a new adminUser via POST /auth/adminUser/join to obtain an
   *    authenticated admin session. The SDK automatically injects the access
   *    token into the connection headers.
   * 2. Generate a random communitySlug value that is extremely unlikely to exist
   *    (using a long random alpha-numeric token with a test-specific prefix),
   *    and crucially, never create any community with this slug inside this
   *    test.
   * 3. Call DELETE /communityPlatform/adminUser/communities/{communitySlug} with
   *    the generated slug.
   * 4. Assert that the DELETE call fails by throwing an HttpError, using
   *    TestValidator.error to ensure an error is observed instead of a silent
   *    success.
   */

  // 1. Join as adminUser to obtain an authenticated admin session.
  const joinBody = {
    username: RandomGenerator.name(3),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a slug that is guaranteed not to exist within this test.
  //    Use a distinctive test-only prefix and a long random alphaNumeric
  //    token to avoid collision with any seeded data.
  const nonExistentSlug: string = `test-nonexistent-community-${RandomGenerator.alphaNumeric(24)}`;

  // 3 & 4. Attempt to delete the non-existent community and assert that
  //    an HttpError is thrown rather than a silent success.
  await TestValidator.error(
    "deleting a non-existent community slug as adminUser should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.erase(
        connection,
        {
          communitySlug: nonExistentSlug,
        },
      );
    },
  );
}
