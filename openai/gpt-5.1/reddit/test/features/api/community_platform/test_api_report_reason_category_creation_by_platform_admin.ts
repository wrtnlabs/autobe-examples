import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can create a new report reason
 * category and that the returned DTO matches the submitted data and expected
 * lifecycle defaults.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin via /auth/platformAdmin/join.
 *
 *    - Use realistic values for username, email, password, displayName, href, and
 *         referrer.
 *    - Let the SDK automatically attach the JWT access token to the connection.
 * 2. As the authenticated platform admin, call
 *    /communityPlatform/platformAdmin/reportReasonCategories to create a new
 *    report reason category.
 *
 *    - Submit an ICommunityPlatformReportReasonCategory.ICreate payload with:
 *
 *         - Code: unique token for this test run
 *         - Name: human-friendly label
 *         - Description: detailed explanation text
 *         - Is_user_visible: explicitly true or false
 *         - Is_active: explicitly true
 * 3. Validate the creation response:
 *
 *    - Typia.assert() ensures it matches ICommunityPlatformReportReasonCategory.
 *    - Ensure `deleted_at` is null or undefined immediately after creation,
 *         representing a non-deleted active category.
 *    - Ensure `code`, `name`, `description`, `is_user_visible`, and `is_active`
 *         match exactly what was submitted.
 *    - Validate that `created_at` and `updated_at` are equal right after insertion,
 *         which is a typical invariant on new rows.
 *
 * Note: The scenario draft mentioned a GET by code endpoint, but only the POST
 * creation endpoint is available in the provided SDK. Therefore, this
 * implementation validates correctness solely from the POST response.
 */
export async function test_api_report_reason_category_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare payload for creating a new report reason category
  const uniqueCode = `spam_${RandomGenerator.alphaNumeric(10)}`;
  const createBody = {
    code: uniqueCode,
    name: "Spam or promotional content",
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const created =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(created);

  // 3. Field-level validations against the original payload
  TestValidator.equals(
    "report reason category code should match the input payload",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "report reason category name should match the input payload",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "report reason category description should match the input payload",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "report reason category is_user_visible should match the input payload",
    created.is_user_visible,
    createBody.is_user_visible,
  );
  TestValidator.equals(
    "report reason category is_active should match the input payload",
    created.is_active,
    createBody.is_active,
  );

  // 4. Lifecycle and timestamp expectations
  // deleted_at is optional and nullable; for a fresh record it should be null or undefined.
  TestValidator.equals(
    "newly created report reason category must not be soft-deleted",
    created.deleted_at ?? null,
    null,
  );

  // For a newly created row, created_at and updated_at are commonly identical.
  TestValidator.equals(
    "created_at and updated_at should be equal immediately after creation",
    created.created_at,
    created.updated_at,
  );
}
