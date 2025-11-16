import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that a platform administrator can delete a post type definition they
 * themselves have just created, and that subsequent operations against the same
 * identifier fail, without relying on non-existent GET endpoints.
 *
 * Business context: Platform administrators manage the catalog of post types
 * stored in the `community_platform_post_types` table. They must be able to:
 *
 * - Join (register) and obtain an authenticated admin session.
 * - Create a new post type definition.
 * - Delete that post type when it is not under usage constraints.
 * - Observe that further operations against the same id no longer succeed.
 *
 * Scenario steps implemented:
 *
 * 1. Register a new platform admin via auth.platformAdmin.join with a realistic
 *    ICommunityPlatformPlatformadmin.IJoin payload. The SDK will attach the
 *    issued access token to the shared connection headers, so subsequent calls
 *    run in an authenticated admin context.
 * 2. Create a fresh post type via communityPlatform.platformAdmin.postTypes.create
 *    using an ICommunityPlatformPostType.ICreate body with random but
 *    reasonable code, name, and description.
 * 3. Assert the returned ICommunityPlatformPostType using typia.assert and keep
 *    its id.
 * 4. Delete the created post type with
 *    communityPlatform.platformAdmin.postTypes.erase.
 * 5. Immediately attempt a second erase for the same id and use
 *    TestValidator.error to assert that this repeated deletion fails, which
 *    indirectly validates that the resource is no longer in a valid, deletable
 *    state.
 */
export async function test_api_post_type_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register", // valid URI format
    referrer: "https://admin.example.com/landing", // valid URI format
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new post type as this platform admin
  const postTypeBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const created: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(created);

  // 3. Delete the created post type
  await api.functional.communityPlatform.platformAdmin.postTypes.erase(
    connection,
    {
      postTypeId: created.id,
    },
  );

  // 4. Second deletion attempt should fail, indirectly confirming deletion
  await TestValidator.error(
    "second deletion of same post type should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.erase(
        connection,
        {
          postTypeId: created.id,
        },
      );
    },
  );
}
