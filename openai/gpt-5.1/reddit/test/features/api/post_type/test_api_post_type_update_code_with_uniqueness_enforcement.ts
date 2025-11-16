import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Ensure post type `code` uniqueness is enforced on update operations.
 *
 * Business intent:
 *
 * - The community platform defines post types (e.g., "text", "image") in the
 *   `community_platform_post_types` table.
 * - The `code` column has a unique index and is the machine-readable identifier
 *   used across the system.
 * - When updating an existing post type, attempts to change its `code` to a value
 *   already used by another active type must fail, preserving data integrity.
 *
 * Scenario steps implemented:
 *
 * 1. Register and authenticate a platform admin via POST /auth/platformAdmin/join.
 *
 *    - Uses ICommunityPlatformPlatformadmin.IJoin.
 *    - This sets Authorization on the shared connection, enabling privileged
 *         platformAdmin operations.
 * 2. Create a first post type with code "text" via POST
 *    /communityPlatform/platformAdmin/postTypes.
 *
 *    - Uses ICommunityPlatformPostType.ICreate.
 * 3. Create a second post type with code "image" via the same create API.
 * 4. Attempt to update the second post type's code to "text" via PUT
 *    /communityPlatform/platformAdmin/postTypes/{postTypeId}.
 *
 *    - Uses ICommunityPlatformPostType.IUpdate with `code: "text"`.
 * 5. Assert that the update operation fails (business/uniqueness violation) using
 *    TestValidator.error, without inspecting error details or HTTP status
 *    codes.
 *
 * Notes and limitations:
 *
 * - No GET-by-id or listing API for post types is provided in the available SDK,
 *   so we cannot re-fetch the second post type to assert that its code remains
 *   unchanged after the failed update. The test therefore focuses on verifying
 *   that the conflicting update call itself fails while create operations
 *   succeed.
 * - The test never performs any invalid TypeScript-level typing or missing
 *   required fields; all DTOs strictly use IJoin, ICreate, and IUpdate with
 *   valid values.
 */
export async function test_api_post_type_update_code_with_uniqueness_enforcement(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create the first post type with code "text".
  const firstCreateBody = {
    code: "text",
    name: "Text",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 9,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const firstPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(firstPostType);

  // 3. Create the second post type with code "image".
  const secondCreateBody = {
    code: "image",
    name: "Image",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 9,
    }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const secondPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: secondCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(secondPostType);

  // Sanity check: the two created post types must have different IDs and codes.
  TestValidator.notEquals(
    "first and second post type IDs must differ",
    firstPostType.id,
    secondPostType.id,
  );
  TestValidator.notEquals(
    "first and second post type codes must differ",
    firstPostType.code,
    secondPostType.code,
  );

  // 4. Attempt to update the second post type's code to the existing code "text".
  const conflictingUpdateBody = {
    code: firstPostType.code,
    name: `${secondPostType.name} (conflict attempt)`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 9,
    }),
  } satisfies ICommunityPlatformPostType.IUpdate;

  await TestValidator.error(
    "updating a post type to an existing code must fail due to unique constraint",
    async () => {
      await api.functional.communityPlatform.platformAdmin.postTypes.update(
        connection,
        {
          postTypeId: secondPostType.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
