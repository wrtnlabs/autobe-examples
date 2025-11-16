import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a community visibility level without optional
 * description.
 *
 * Business purpose: Ensure that a platform administrator can create a new
 * `community_platform_community_visibility_levels` master record using only the
 * required fields (`code`, `name`) while omitting the optional `description`.
 * The test verifies that the backend treats `description` as optional, does not
 * auto-populate it with unintended content, and properly initializes lifecycle
 * timestamps and deletion state.
 *
 * Flow:
 *
 * 1. Register and authenticate a platform administrator via `POST
 *    /auth/platformAdmin/join`.
 * 2. Using the authenticated connection, call `POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels` with an
 *    `ICommunityPlatformCommunityVisibilityLevel.ICreate` body that includes
 *    only `code` and `name`, omitting `description` entirely.
 * 3. Assert that the response is a valid
 *    `ICommunityPlatformCommunityVisibilityLevel` and that:
 *
 *    - `code` matches the request
 *    - `name` matches the request
 *    - `description` remains unset/undefined
 *    - `created_at` and `updated_at` are populated
 *    - `deleted_at` is null or undefined (not logically deleted)
 */
export async function test_api_community_visibility_level_creation_missing_optional_description(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a visibility level without description
  const visibilityCode = `missing-desc-${RandomGenerator.alphaNumeric(12)}`;
  const visibilityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

  const createBody = {
    code: visibilityCode,
    name: visibilityName,
    // description is intentionally omitted to test optional behavior
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const created: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Validate response fields
  TestValidator.equals(
    "visibility level code matches request when description is omitted",
    created.code,
    visibilityCode,
  );
  TestValidator.equals(
    "visibility level name matches request when description is omitted",
    created.name,
    visibilityName,
  );

  // description is optional: since we did not send it, we expect it to be
  // undefined on the DTO, not auto-populated with some default text.
  TestValidator.predicate(
    "description should remain undefined when omitted in create payload",
    created.description === undefined,
  );

  // created_at and updated_at are managed by the system; typia.assert already
  // guarantees they are valid date-time strings, but we also ensure they are
  // non-empty for business sanity.
  TestValidator.predicate(
    "created_at must be a non-empty date-time string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty date-time string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );

  // deleted_at should represent an active record: either undefined or null.
  TestValidator.predicate(
    "deleted_at should be null or undefined for a newly created visibility level",
    created.deleted_at === null || created.deleted_at === undefined,
  );
}
