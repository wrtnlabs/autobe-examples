import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReasonCategory";

/**
 * Validate searching report reason categories by code and active status as a
 * platform admin.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a platform admin account.
 * 2. Create two distinct report reason categories ("spam" active, "harassment"
 *    inactive).
 * 3. Search with filters code="spam" and isActive=true and verify only the active
 *    spam category is returned.
 * 4. Search with filter isActive=false (no code) and verify only inactive
 *    categories like "harassment" are returned.
 *
 * Business validation points:
 *
 * - Exact-match code filters return only categories with the given business code.
 * - IsActive flag correctly filters active vs inactive categories.
 * - Combined filters (code + isActive) apply as an AND condition.
 */
export async function test_api_report_reason_categories_search_filter_by_code_and_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin.
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create two distinct report reason categories.
  const spamCreate = {
    code: "spam",
    name: "Spam or advertising",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const harassmentCreate = {
    code: "harassment",
    name: "Harassment or hate",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const spamCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: spamCreate },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(spamCategory);

  const harassmentCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: harassmentCreate },
    );
  typia.assert<ICommunityPlatformReportReasonCategory>(harassmentCategory);

  // 3. Search with filters code="spam" and isActive=true.
  const searchSpamBody = {
    page: 0 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    code: "spam",
    isActive: true,
  } satisfies ICommunityPlatformReportReasonCategory.IRequest;

  const spamSearchPage =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
      connection,
      { body: searchSpamBody },
    );
  typia.assert<IPageICommunityPlatformReportReasonCategory.ISummary>(
    spamSearchPage,
  );

  // Validate that exactly one result is returned and it matches the spam category.
  TestValidator.equals(
    "spam search returns exactly one result",
    spamSearchPage.data.length,
    1,
  );

  const spamResult = spamSearchPage.data[0];
  TestValidator.equals("spam result code is 'spam'", spamResult.code, "spam");
  TestValidator.equals(
    "spam result is_active is true",
    spamResult.is_active,
    true,
  );
  TestValidator.equals(
    "spam result id matches created spam category",
    spamResult.id,
    spamCategory.id,
  );

  // 4. Search with isActive=false (no code filter) to get inactive categories.
  const searchInactiveBody = {
    page: 0 as number & tags.Type<"int32">,
    pageSize: 10 as number & tags.Type<"int32">,
    isActive: false,
  } satisfies ICommunityPlatformReportReasonCategory.IRequest;

  const inactiveSearchPage =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
      connection,
      { body: searchInactiveBody },
    );
  typia.assert<IPageICommunityPlatformReportReasonCategory.ISummary>(
    inactiveSearchPage,
  );

  // Ensure that at least one inactive category exists and includes the created harassment category.
  TestValidator.predicate(
    "inactive search returns at least one result",
    inactiveSearchPage.data.length > 0,
  );

  const hasHarassment = inactiveSearchPage.data.some(
    (summary) => summary.id === harassmentCategory.id,
  );
  TestValidator.predicate(
    "inactive search includes harassment category",
    hasHarassment,
  );

  const hasActiveInInactive = inactiveSearchPage.data.some(
    (summary) => summary.is_active === true,
  );
  TestValidator.equals(
    "inactive search does not return active categories",
    hasActiveInInactive,
    false,
  );
}
