import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate platform-admin-driven update flow for report reason categories.
 *
 * Business goals:
 *
 * - Ensure a freshly joined platform admin can create a report reason category
 *   and then update its mutable fields (name, description, visibility flags) by
 *   addressing it via its stable business code.
 * - Verify that system-managed identifiers and timestamps behave correctly: id
 *   and code remain stable across updates, created_at remains unchanged,
 *   updated_at is refreshed, and deleted_at stays null/undefined for active
 *   categories.
 * - Confirm that subsequent updates always return the latest state.
 *
 * Steps:
 *
 * 1. Join as a platform admin (POST /auth/platformAdmin/join) and obtain an
 *    authenticated connection via SDK side-effected Authorization header.
 * 2. Create a new report reason category using POST
 *    /communityPlatform/platformAdmin/reportReasonCategories with an
 *    ICommunityPlatformReportReasonCategory.ICreate body.
 * 3. Assert that the creation response matches the requested business fields and
 *    that id, created_at, and updated_at are populated while deleted_at is
 *    null/undefined.
 * 4. Update that category via PUT
 *    /communityPlatform/platformAdmin/reportReasonCategories/{code} using
 *    ICommunityPlatformReportReasonCategory.IUpdate to tweak name, description,
 *    and toggle is_user_visible and is_active.
 * 5. Assert that id and code remain unchanged, mutable fields reflect the update,
 *    created_at is preserved, updated_at has changed, and deleted_at remains
 *    null/undefined.
 * 6. Perform a second update to validate that further changes are also reflected
 *    and that updated_at moves forward again.
 */
export async function test_api_report_reason_category_update_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // Basic sanity checks on admin payload
  TestValidator.predicate(
    "platform admin id must be a non-empty UUID string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create initial report reason category
  const initialCreateBody = {
    code: "spam" + RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: initialCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(createdCategory);

  // Validate creation: business fields
  TestValidator.equals(
    "created category code should match request body code",
    createdCategory.code,
    initialCreateBody.code,
  );
  TestValidator.equals(
    "created category name should match request body name",
    createdCategory.name,
    initialCreateBody.name,
  );
  TestValidator.equals(
    "created category description should match request body description",
    createdCategory.description,
    initialCreateBody.description,
  );
  TestValidator.equals(
    "created category is_user_visible should match request body flag",
    createdCategory.is_user_visible,
    initialCreateBody.is_user_visible,
  );
  TestValidator.equals(
    "created category is_active should match request body flag",
    createdCategory.is_active,
    initialCreateBody.is_active,
  );

  // Validate system-managed fields
  TestValidator.predicate(
    "created category id should be a non-empty string",
    typeof createdCategory.id === "string" && createdCategory.id.length > 0,
  );
  TestValidator.predicate(
    "created category created_at should be a non-empty string",
    typeof createdCategory.created_at === "string" &&
      createdCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "created category updated_at should be a non-empty string",
    typeof createdCategory.updated_at === "string" &&
      createdCategory.updated_at.length > 0,
  );
  TestValidator.equals(
    "created category deleted_at should be null or undefined for active category",
    createdCategory.deleted_at ?? null,
    null,
  );

  const originalId = createdCategory.id;
  const originalCode = createdCategory.code;
  const originalCreatedAt = createdCategory.created_at;
  const originalUpdatedAt = createdCategory.updated_at;

  // 3. First update: change name, description, and toggle flags
  const firstUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: false,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updatedOnce =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: originalCode,
        body: firstUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(updatedOnce);

  // Verify identifiers and code stability
  TestValidator.equals(
    "updatedOnce.id must remain equal to original id",
    updatedOnce.id,
    originalId,
  );
  TestValidator.equals(
    "updatedOnce.code must remain equal to original code",
    updatedOnce.code,
    originalCode,
  );

  // Verify mutable fields reflect updates
  TestValidator.equals(
    "updatedOnce.name should match first update name",
    updatedOnce.name,
    firstUpdateBody.name,
  );
  TestValidator.equals(
    "updatedOnce.description should match first update description",
    updatedOnce.description,
    firstUpdateBody.description,
  );
  TestValidator.equals(
    "updatedOnce.is_user_visible should match first update flag",
    updatedOnce.is_user_visible,
    firstUpdateBody.is_user_visible,
  );
  TestValidator.equals(
    "updatedOnce.is_active should match first update flag",
    updatedOnce.is_active,
    firstUpdateBody.is_active,
  );

  // created_at should be preserved, updated_at should move forward or change
  TestValidator.equals(
    "updatedOnce.created_at should equal original created_at",
    updatedOnce.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updatedOnce.updated_at should differ from original updated_at after update",
    updatedOnce.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "updatedOnce.deleted_at should still be null or undefined",
    updatedOnce.deleted_at ?? null,
    null,
  );

  const updatedOnceUpdatedAt = updatedOnce.updated_at;

  // 4. Second update: toggle is_active back and tweak name again
  const secondUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updatedTwice =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: originalCode,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(updatedTwice);

  // Identifiers and code must still be stable
  TestValidator.equals(
    "updatedTwice.id must remain equal to original id",
    updatedTwice.id,
    originalId,
  );
  TestValidator.equals(
    "updatedTwice.code must remain equal to original code",
    updatedTwice.code,
    originalCode,
  );

  // Name and is_active must reflect the second update; description and
  // is_user_visible should preserve last values (since not touched)
  TestValidator.equals(
    "updatedTwice.name should match second update name",
    updatedTwice.name,
    secondUpdateBody.name,
  );
  TestValidator.equals(
    "updatedTwice.is_active should match second update flag",
    updatedTwice.is_active,
    secondUpdateBody.is_active,
  );
  TestValidator.equals(
    "updatedTwice.description should remain from first update when not changed",
    updatedTwice.description,
    updatedOnce.description,
  );
  TestValidator.equals(
    "updatedTwice.is_user_visible should remain from first update when not changed",
    updatedTwice.is_user_visible,
    updatedOnce.is_user_visible,
  );

  // created_at must still be preserved; updated_at should move forward again
  TestValidator.equals(
    "updatedTwice.created_at should still equal original created_at",
    updatedTwice.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updatedTwice.updated_at should differ from first updated updated_at",
    updatedTwice.updated_at,
    updatedOnceUpdatedAt,
  );
  TestValidator.equals(
    "updatedTwice.deleted_at should still be null or undefined",
    updatedTwice.deleted_at ?? null,
    null,
  );
}
