import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that the report reason category detail endpoint reflects the latest
 * updates.
 *
 * Business flow:
 *
 * 1. Platform admin joins (and becomes authenticated).
 * 2. Admin creates a report reason category with initial configuration.
 * 3. Admin updates that category (name, description, visibility, active flag).
 * 4. Admin fetches the category detail by code.
 * 5. The detail response must reflect updated fields while preserving id, code,
 *    and created_at, and updated_at must change compared to the initial
 *    creation.
 */
export async function test_api_report_reason_category_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial report reason category
  const initialCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: initialCode,
    name: "Initial Spam Category",
    description: "Initial description for spam-related reports.",
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const created: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created code equals requested code",
    created.code,
    initialCode,
  );
  TestValidator.equals(
    "created name equals initial name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created description equals initial description",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created is_user_visible equals initial flag",
    created.is_user_visible,
    createBody.is_user_visible,
  );
  TestValidator.equals(
    "created is_active equals initial flag",
    created.is_active,
    createBody.is_active,
  );

  const createdUpdatedAt = created.updated_at;
  const createdCreatedAt = created.created_at;

  // 3. Update the existing report reason category
  const updateBody = {
    name: "Updated Spam Category",
    description: "Updated description with more detailed guidance.",
    is_user_visible: false,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updated: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: created.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // Validate immutable fields remain the same between create and update
  TestValidator.equals("updated id equals created id", updated.id, created.id);
  TestValidator.equals(
    "updated code equals created code",
    updated.code,
    created.code,
  );

  // Validate mutable fields reflect new values in update response
  TestValidator.equals(
    "updated name equals new name",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated description equals new description",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated is_user_visible equals new flag",
    updated.is_user_visible,
    updateBody.is_user_visible,
  );
  TestValidator.equals(
    "updated is_active equals new flag",
    updated.is_active,
    updateBody.is_active,
  );

  // created_at must be preserved; updated_at should change (if implementation updates timestamps)
  TestValidator.equals(
    "created_at preserved after update",
    updated.created_at,
    createdCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed after update compared to initial",
    updated.updated_at,
    createdUpdatedAt,
  );

  // 4. Fetch the category detail via GET by code
  const detailed: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.at(
      connection,
      { reportReasonCategoryCode: created.code },
    );
  typia.assert(detailed);

  // 5. Validate that detail reflects the latest update and preserves immutable fields
  TestValidator.equals("detail id equals created id", detailed.id, created.id);
  TestValidator.equals(
    "detail code equals created code",
    detailed.code,
    created.code,
  );
  TestValidator.equals(
    "detail name equals updated name",
    detailed.name,
    updateBody.name,
  );
  TestValidator.equals(
    "detail description equals updated description",
    detailed.description,
    updateBody.description,
  );
  TestValidator.equals(
    "detail is_user_visible equals updated flag",
    detailed.is_user_visible,
    updateBody.is_user_visible,
  );
  TestValidator.equals(
    "detail is_active equals updated flag",
    detailed.is_active,
    updateBody.is_active,
  );

  TestValidator.equals(
    "detail created_at preserved from creation",
    detailed.created_at,
    createdCreatedAt,
  );
  TestValidator.notEquals(
    "detail updated_at differs from initial created updated_at",
    detailed.updated_at,
    createdUpdatedAt,
  );
}
