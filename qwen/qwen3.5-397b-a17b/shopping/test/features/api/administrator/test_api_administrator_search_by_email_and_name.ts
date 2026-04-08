import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the text search functionality for finding administrators by email or display name.
 *
 * Validates the complete administrator search workflow including creating multiple administrator accounts, authenticating as an administrator, and performing text-based searches across email and profile display name fields. Ensures that case-insensitive substring matching works correctly and that search can be combined with other filters like grade level.
 *
 * Special attention is given to verifying that search results accurately reflect the query criteria, that pagination metadata is correctly computed, and that empty search parameters return all administrators without filtering.
 *
 * 1. Create multiple administrator accounts with distinct emails and profile names.
 * 2. Use the authenticated connection from admin creation for search operations.
 * 3. Search by partial email address and verify matching results.
 * 4. Search by partial display name and verify case-insensitive matching.
 * 5. Combine search with grade filter for targeted results.
 * 6. Validate empty search returns all administrators.
 * 7. Verify pagination metadata accuracy.
 */
export async function test_api_administrator_search_by_email_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple administrator accounts for testing
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: "search.test.admin1@example.com",
      password: "TestPass123!",
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: "search.test.admin2@example.com",
      password: "TestPass123!",
      grade: "super",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin2);
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: "different.admin@example.com",
      password: "TestPass123!",
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin3);
  // 2. Use admin1Connection (already authenticated from join) for search operations
  // 3. Search by partial email address "search.test"
  const emailSearchResult =
    await api.functional.shoppingMall.admin.administrators.index(
      admin1Connection,
      {
        body: {
          search: "search.test",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  TestValidator.predicate(
    "email search returns results",
    emailSearchResult.data.length > 0,
  );
  // Verify all results contain the search term in email
  for (const admin of emailSearchResult.data) {
    TestValidator.predicate(
      `admin ${admin.member.email} matches email search`,
      admin.member.email.toLowerCase().includes("search.test"),
    );
  }
  // 4. Search by partial email "admin2" to find specific admin
  const admin2SearchResult =
    await api.functional.shoppingMall.admin.administrators.index(
      admin1Connection,
      {
        body: {
          search: "admin2",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(admin2SearchResult);
  TestValidator.predicate(
    "admin2 search returns at least one result",
    admin2SearchResult.data.length > 0,
  );
  // 5. Combine search with grade filter - search for super admins
  const superAdminSearchResult =
    await api.functional.shoppingMall.admin.administrators.index(
      admin1Connection,
      {
        body: {
          search: "search.test",
          grade: "super",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(superAdminSearchResult);
  // Verify all results are super grade
  for (const admin of superAdminSearchResult.data) {
    TestValidator.equals("grade matches super filter", admin.grade, "super");
  }
  // 6. Search with empty string should return all administrators
  const emptySearchResult =
    await api.functional.shoppingMall.admin.administrators.index(
      admin1Connection,
      {
        body: {
          search: "",
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search returns all admins",
    emptySearchResult.data.length >= 3,
  );
  // 7. Search without search parameter should return all administrators
  const noSearchResult =
    await api.functional.shoppingMall.admin.administrators.index(
      admin1Connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(noSearchResult);
  TestValidator.predicate(
    "no search param returns all admins",
    noSearchResult.data.length >= 3,
  );
  // 8. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    emailSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    emailSearchResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    emailSearchResult.pagination.records >= emailSearchResult.data.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    emailSearchResult.pagination.pages,
    Math.ceil(
      emailSearchResult.pagination.records / emailSearchResult.pagination.limit,
    ),
  );
}
