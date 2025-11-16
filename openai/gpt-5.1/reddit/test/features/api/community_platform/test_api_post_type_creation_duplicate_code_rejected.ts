import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Verify that creating a post type with a duplicate `code` is rejected.
 *
 * Business context: Platform administrators manage the catalog of supported
 * post types in the `community_platform_post_types` table. Each post type is
 * identified by a machine-readable `code` that must be unique across active
 * (non-retired) records. This uniqueness is enforced by a database unique index
 * on `community_platform_post_types.code` and must be surfaced as a business
 * rule at the API layer.
 *
 * This test ensures that:
 *
 * - A platform admin can create a new post type with a unique `code`.
 * - A subsequent attempt to create another post type with the same `code` (even
 *   if `name`/`description` differ) fails with a business-rule error.
 * - The error is observable as a rejected Promise from the create endpoint,
 *   without relying on specific HTTP status codes.
 *
 * Flow:
 *
 * 1. Register a new platform admin using /auth/platformAdmin/join. This also
 *    establishes an authenticated context by setting the Authorization header
 *    on the connection.
 * 2. Call POST /communityPlatform/platformAdmin/postTypes once with a unique
 *    `code`, `name`, and `description`, and assert success.
 * 3. Call the same endpoint again with the identical `code` but different
 *    `name`/`description`.
 * 4. Assert that the second call fails (throws) using TestValidator.error,
 *    indicating enforcement of the unique index on `code`.
 */
export async function test_api_post_type_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.community-platform.test/register",
    referrer: "https://community-platform.test/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create an initial post type with a unique code
  const uniqueCodePrefix = RandomGenerator.alphabets(10);
  const postTypeCode = `${uniqueCodePrefix}_text_variant`;

  const firstCreateBody = {
    code: postTypeCode,
    name: "Text Variant v1",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const firstPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: firstCreateBody },
    );
  typia.assert<ICommunityPlatformPostType>(firstPostType);

  TestValidator.equals(
    "first post type code should match input code",
    firstPostType.code,
    postTypeCode,
  );

  // 3. Attempt to create another post type with the same code
  const secondCreateBody = {
    code: postTypeCode, // same code to trigger uniqueness violation
    name: "Text Variant v2",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  // 4. Assert that the second creation fails due to unique code constraint
  await TestValidator.error(
    "duplicate post type code creation should be rejected",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.create(
        connection,
        { body: secondCreateBody },
      );
    },
  );
}
