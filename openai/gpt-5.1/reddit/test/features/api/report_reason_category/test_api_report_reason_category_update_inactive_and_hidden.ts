import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can retire a report reason category
 * from active, user-visible use while preserving its identity and audit
 * history.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator via auth.platformAdmin.join.
 * 2. As this admin, create a user-visible & active report reason category.
 * 3. Confirm the created category reflects the requested visible/active flags.
 * 4. Update the same category via its business code to set both is_user_visible
 *    and is_active to false (optionally tweak text fields).
 * 5. Assert that identity fields (id, code, created_at) are preserved while
 *    updated_at is advanced and flags are turned off.
 */
export async function test_api_report_reason_category_update_inactive_and_hidden(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create a user-visible & active report reason category
  const categoryCode = `spam_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: categoryCode,
    name: "Spam and unsolicited advertising",
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
      { body: createBody },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(created);

  // Basic sanity checks on created category
  TestValidator.equals(
    "created category code matches input code",
    created.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category is initially user visible",
    created.is_user_visible,
    true,
  );
  TestValidator.equals(
    "created category is initially active",
    created.is_active,
    true,
  );

  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Update category to be hidden and inactive
  const updateBody = {
    name: `${created.name} (deprecated)`,
    description: `${created.description}\nThis reason is no longer presented to end users but retained for historical analytics.`,
    is_user_visible: false,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  const updated =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: created.code,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(updated);

  // 4. Assert identity is preserved
  TestValidator.equals(
    "updated category id should remain unchanged",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated category code should remain unchanged",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // 5. Assert visibility/activation flags flipped off
  TestValidator.equals(
    "is_user_visible flag should be set to false after update",
    updated.is_user_visible,
    false,
  );
  TestValidator.equals(
    "is_active flag should be set to false after update",
    updated.is_active,
    false,
  );

  // 6. Assert updated_at moved forward (strictly greater than before)
  const originalUpdatedAtMs = Date.parse(originalUpdatedAt);
  const newUpdatedAtMs = Date.parse(updated.updated_at);

  TestValidator.predicate(
    "updated_at timestamp should be greater than original updated_at",
    newUpdatedAtMs > originalUpdatedAtMs,
  );
}
