import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformContentPolicyCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentPolicyCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate creation of a non-default, inactive content policy category by a
 * platform administrator and persistence of configuration flags.
 *
 * Business context
 *
 * - Global content policy categories are managed by platform administrators.
 * - Not all categories must be active nor part of the default taxonomy.
 * - Platform admins may stage, experiment with, or retire categories by toggling
 *   `isActive` and controlling `isDefault` membership.
 *
 * This test verifies that:
 *
 * 1. A platform admin can register and obtain an authenticated context.
 * 2. Using that admin context, they can create a content policy category that is
 *    both non-default and inactive.
 * 3. The API response reflects the exact configuration flags and metadata sent in
 *    the creation request, and basic lifecycle timestamps are populated as
 *    expected.
 *
 * Step-by-step scenario
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join using
 *    ICommunityPlatformPlatformadmin.IJoin:
 *
 *    - Provide realistic username, email, password, and displayName.
 *    - Supply href and referrer as valid URI strings.
 *    - Optionally provide ip, or omit it. The SDK call automatically installs the
 *         Authorization header on the provided connection using the returned
 *         token.access.
 * 2. With the authenticated admin connection, call POST
 *    /communityPlatform/platformAdmin/contentPolicyCategories with a body
 *    satisfying ICommunityPlatformContentPolicyCategory.ICreate:
 *
 *    - Code: stable business identifier such as "experimental_pilot_policy_<random>"
 *         to avoid uniqueness clashes.
 *    - Name: human-readable label reflecting experimental / pilot scope.
 *    - Description: multi-sentence text clearly marking this as an experimental or
 *         limited rollout category.
 *    - IsActive: false (category is staged or retired, not currently offered for new
 *         configurations).
 *    - IsDefault: false (category is not part of the platform-wide baseline
 *         taxonomy).
 * 3. Validate the response ICommunityPlatformContentPolicyCategory:
 *
 *    - Typia.assert(output) to ensure full structural correctness, including
 *         `createdAt`, `updatedAt`, and optional `deletedAt`.
 *    - Test that output.code, output.name, output.description, output.isActive, and
 *         output.isDefault match the request body.
 *    - Verify `deletedAt` is either undefined or null, indicating the category is
 *         not soft-deleted on creation.
 *    - Optionally ensure `createdAt` and `updatedAt` are non-empty strings;
 *         typia.assert already validates their date-time format.
 * 4. No further listing or retrieval call is required because the create()
 *    endpoint already returns the full canonical DTO. The focus is on flag
 *    persistence and correctness of the creation behavior under a platformAdmin
 *    authentication context.
 */
export async function test_api_content_policy_category_creation_non_default_or_inactive(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator via join
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorizedAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorizedAdmin);

  // 2. Create a non-default, inactive content policy category
  const uniqueSuffix = RandomGenerator.alphaNumeric(6);
  const createBody = {
    code: `experimental_pilot_policy_${uniqueSuffix}`,
    name: "Experimental Pilot Policy Category",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 4,
      wordMax: 10,
    }),
    isActive: false,
    isDefault: false,
  } satisfies ICommunityPlatformContentPolicyCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.contentPolicyCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformContentPolicyCategory>(createdCategory);

  // 3. Validate that core fields and flags are persisted correctly
  TestValidator.equals(
    "content policy category code should match input",
    createdCategory.code,
    createBody.code,
  );
  TestValidator.equals(
    "content policy category name should match input",
    createdCategory.name,
    createBody.name,
  );
  TestValidator.equals(
    "content policy category description should match input",
    createdCategory.description,
    createBody.description,
  );
  TestValidator.equals(
    "content policy category isActive should be false",
    createdCategory.isActive,
    false,
  );
  TestValidator.equals(
    "content policy category isDefault should be false",
    createdCategory.isDefault,
    false,
  );

  // 4. Lifecycle fields: createdAt/updatedAt are validated by typia.assert.
  // Check that deletedAt is either undefined or null on creation.
  TestValidator.predicate(
    "deletedAt should be null or undefined on freshly created category",
    createdCategory.deletedAt === null ||
      createdCategory.deletedAt === undefined,
  );
}
