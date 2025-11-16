import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostType";

/**
 * Validate basic pagination behavior for platform admin post type index.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform administrator.
 * 2. Create at least two distinct post types as that admin.
 * 3. Query the post types index with a small pageSize (1) sorted by code asc.
 * 4. Validate pagination metadata and that at least one created post type appears
 *    on the first page.
 * 5. Fetch the second page and ensure both created post types appear across the
 *    first two pages combined.
 */
export async function test_api_platform_admin_post_type_index_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least two distinct post types.
  const code1 = `text_type_e2e_${RandomGenerator.alphaNumeric(8)}`;
  const code2 = `text_type_e2e_${RandomGenerator.alphaNumeric(8)}`;

  const createPostTypeBody1 = {
    code: code1,
    name: "E2E Text Type 1",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const createPostTypeBody2 = {
    code: code2,
    name: "E2E Text Type 2",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType1: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: createPostTypeBody1 },
    );
  typia.assert(postType1);

  const postType2: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      { body: createPostTypeBody2 },
    );
  typia.assert(postType2);

  // 3. Query index with small pageSize and sorting.
  const pageSize = 1;

  const indexRequestPage1 = {
    page: 1,
    pageSize,
    sortBy: "code",
    sortOrder: "asc" as const,
  } satisfies ICommunityPlatformPostType.IRequest;

  const page1: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: indexRequestPage1 },
    );
  typia.assert(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  const data1: ICommunityPlatformPostType.ISummary[] = page1.data;

  // 4. Validate pagination metadata and basic constraints for page 1.
  TestValidator.predicate(
    "page1 current page should be >= 1",
    pagination1.current >= 1,
  );
  TestValidator.predicate(
    "page1 limit should be positive",
    pagination1.limit > 0,
  );
  TestValidator.predicate(
    "page1 data length should not exceed pageSize",
    data1.length <= pageSize,
  );
  TestValidator.predicate(
    "page1 total records should be at least 2",
    pagination1.records >= 2,
  );
  TestValidator.predicate(
    "page1 pages should be at least 1",
    pagination1.pages >= 1,
  );

  // Ensure at least one of our created codes appears in page1.
  const page1Codes = data1.map((d) => d.code);
  TestValidator.predicate(
    "at least one created post type should appear in page1",
    page1Codes.includes(code1) || page1Codes.includes(code2),
  );

  // 5. Fetch second page to verify multi-page navigation and overall coverage.
  const indexRequestPage2 = {
    page: 2,
    pageSize,
    sortBy: "code",
    sortOrder: "asc" as const,
  } satisfies ICommunityPlatformPostType.IRequest;

  const page2: IPageICommunityPlatformPostType.ISummary =
    await api.functional.communityPlatform.platformAdmin.postTypes.index(
      connection,
      { body: indexRequestPage2 },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  const data2: ICommunityPlatformPostType.ISummary[] = page2.data;

  TestValidator.equals(
    "page2 current page should be 2 when requesting page 2",
    pagination2.current,
    2,
  );
  TestValidator.predicate(
    "page2 data length should not exceed pageSize",
    data2.length <= pageSize,
  );

  // Combine summaries from both pages and ensure both created post types are present somewhere.
  const combinedSummaries: ICommunityPlatformPostType.ISummary[] = [
    ...data1,
    ...data2,
  ];
  const combinedIds = combinedSummaries.map((s) => s.id);
  const combinedCodes = combinedSummaries.map((s) => s.code);

  TestValidator.predicate(
    "combined page1 and page2 results should contain postType1",
    combinedIds.includes(postType1.id) ||
      combinedCodes.includes(postType1.code),
  );
  TestValidator.predicate(
    "combined page1 and page2 results should contain postType2",
    combinedIds.includes(postType2.id) ||
      combinedCodes.includes(postType2.code),
  );
}
