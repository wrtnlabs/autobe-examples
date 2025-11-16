import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Validate that a platform administrator can successfully create a new post
 * type definition.
 *
 * Business context: Platform-wide post types (such as "text", "link", or
 * "poll") are privileged configuration that only platform administrators may
 * manage. This test ensures that a freshly registered platform admin can
 * successfully create a new post type using the dedicated configuration
 * endpoint and that the system-populated metadata fields are correctly set.
 *
 * End-to-end steps:
 *
 * 1. Register a new platformAdmin
 *
 *    - Call api.functional.auth.platformAdmin.join with a realistic IJoin payload.
 *    - Rely on the SDK to attach the returned access token to
 *         connection.headers.Authorization.
 *    - Validate the authorized payload shape with typia.assert.
 * 2. Create a new post type as that platformAdmin
 *
 *    - Build a unique code like "poll-<random>" so we do not collide with previous
 *         types.
 *    - Provide a clear name like "Poll" and a detailed description paragraph.
 *    - Call api.functional.communityPlatform.platformAdmin.postTypes.create with a
 *         body that satisfies ICommunityPlatformPostType.ICreate.
 * 3. Validate the created post type
 *
 *    - Use typia.assert to fully validate that the response conforms to
 *         ICommunityPlatformPostType.
 *    - Assert with TestValidator that:
 *
 *         - The response.code equals the requested code.
 *         - The response.name equals the requested name.
 *         - The response.description equals the requested description.
 *         - Response.id is a non-empty string (UUID format is already validated by
 *                   typia.assert).
 *         - Response.created_at and response.updated_at are non-empty strings.
 *         - Response.deleted_at is null or undefined on creation (soft-delete semantics).
 */
export async function test_api_post_type_creation_success_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator using the join endpoint
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(12)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new post type using the authenticated admin context
  const postTypeCode = `poll-${RandomGenerator.alphaNumeric(8)}`;
  const postTypeName = "Poll";
  const postTypeDescription = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 3,
    wordMax: 10,
  });

  const createBody = {
    code: postTypeCode,
    name: postTypeName,
    description: postTypeDescription,
  } satisfies ICommunityPlatformPostType.ICreate;

  const createdPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: createBody,
      },
    );

  // 3. Validate response type and business invariants
  typia.assert<ICommunityPlatformPostType>(createdPostType);

  // Echo back fields must match
  TestValidator.equals(
    "post type code should match the requested code",
    createdPostType.code,
    createBody.code,
  );
  TestValidator.equals(
    "post type name should match the requested name",
    createdPostType.name,
    createBody.name,
  );
  TestValidator.equals(
    "post type description should match the requested description",
    createdPostType.description,
    createBody.description,
  );

  // id must be a non-empty UUID string (UUID format already guaranteed by typia.assert)
  TestValidator.predicate(
    "created post type id should be a non-empty string",
    createdPostType.id.length > 0,
  );

  // created_at and updated_at should be non-empty strings
  TestValidator.predicate(
    "created_at should be a non-empty string",
    createdPostType.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    createdPostType.updated_at.length > 0,
  );

  // deleted_at must be null or undefined on creation (soft-delete semantics)
  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    createdPostType.deleted_at === null ||
      createdPostType.deleted_at === undefined,
  );
}
