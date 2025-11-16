import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can retrieve detailed configuration of
 * a report reason category by its unique business code.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join. This both
 *    creates the admin account and issues JWT tokens that the SDK automatically
 *    wires into the connection for subsequent calls.
 * 2. As the authenticated platform admin, create a new report reason category via
 *    POST /communityPlatform/platformAdmin/reportReasonCategories using a
 *    fully-populated ICommunityPlatformReportReasonCategory.ICreate payload.
 * 3. Retrieve the same category using GET
 *    /communityPlatform/platformAdmin/reportReasonCategories/{reportReasonCategoryCode}
 *    by passing the business code that was used during creation.
 * 4. Verify that the detail response matches the created configuration for all
 *    admin-controlled fields (code, name, description, is_user_visible,
 *    is_active) and that structural fields like id, created_at, updated_at are
 *    present and well-formed.
 * 5. Additionally confirm that the category has not been soft-deleted immediately
 *    after creation by ensuring deleted_at is null or undefined.
 */
export async function test_api_report_reason_category_detail_retrieval_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain authenticated context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
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

  // 2. Create a new report reason category as this platform admin
  const categoryCode = `spam_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(createdCategory);

  // 3. Retrieve category detail by its business code
  const detail =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.at(
      connection,
      {
        reportReasonCategoryCode: createdCategory.code,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(detail);

  // 4. Validate that detail matches created configuration for key fields
  TestValidator.equals(
    "report reason category code should match between create and detail",
    detail.code,
    createdCategory.code,
  );

  TestValidator.equals(
    "report reason category name should match between create and detail",
    detail.name,
    createdCategory.name,
  );

  TestValidator.equals(
    "report reason category description should match between create and detail",
    detail.description,
    createdCategory.description,
  );

  TestValidator.equals(
    "report reason category is_user_visible flag should match between create and detail",
    detail.is_user_visible,
    createdCategory.is_user_visible,
  );

  TestValidator.equals(
    "report reason category is_active flag should match between create and detail",
    detail.is_active,
    createdCategory.is_active,
  );

  // 5. Verify that the category is not soft-deleted immediately after creation
  TestValidator.predicate(
    "report reason category deleted_at should be null or undefined right after creation",
    detail.deleted_at === null || detail.deleted_at === undefined,
  );

  // Additional sanity checks on identifiers and timestamps are implicitly
  // covered by typia.assert via the ICommunityPlatformReportReasonCategory
  // type, so no extra type-level assertions are required here.
}
