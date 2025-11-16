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

export async function test_api_report_reason_categories_search_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also configures Authorization header)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one report reason category as this admin
  const createBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const createdCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCategory);

  // 3. Prepare a minimal search request payload
  const searchRequest = {
    page: 0 satisfies number,
    pageSize: 10 satisfies number,
  } satisfies ICommunityPlatformReportReasonCategory.IRequest;

  // 4. Build an unauthenticated connection by cloning and clearing headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to search without authentication and expect a generic error
  await TestValidator.error(
    "reportReasonCategories search requires authentication",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
        unauthConnection,
        { body: searchRequest },
      );
    },
  );

  // 6. With authenticated connection, the same search should succeed
  const page: IPageICommunityPlatformReportReasonCategory.ISummary =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.index(
      connection,
      { body: searchRequest },
    );
  typia.assert(page);

  // 7. Validate that created category is present in the authenticated result set
  const found = page.data.find((c) => c.id === createdCategory.id);
  TestValidator.predicate(
    "authenticated search should return the created report reason category",
    found !== undefined,
  );
}
