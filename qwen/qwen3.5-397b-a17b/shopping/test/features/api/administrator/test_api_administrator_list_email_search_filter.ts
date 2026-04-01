import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can filter administrator accounts by email address using partial match search.
 *
 * **Test Steps:**
 * 1. Register and authenticate as super administrator
 * 2. List all administrators without filter to get baseline
 * 3. Call the administrators list endpoint with search parameter set to 'admin'
 * 4. Verify only administrators with 'admin' in their email address are returned
 * 5. Verify pagination metadata reflects the filtered result count
 * 6. Test with different search patterns to confirm partial matching works correctly
 *
 * **Validation Points:**
 * - Search filter correctly matches partial email strings
 * - Filtered results exclude non-matching administrators
 * - Pagination records count matches filtered result set
 * - Search is case-insensitive as per business requirements
 */
export async function test_api_administrator_list_email_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. List all administrators without filter to get baseline
  const allAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(allAdmins);
  // 3. Test email search with partial match pattern 'admin'
  const searchPattern = "admin";
  const filteredAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          search: searchPattern,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(filteredAdmins);
  // 4. Verify all returned administrators have 'admin' in their email (case-insensitive)
  TestValidator.predicate("all filtered admins have search term in email", () =>
    filteredAdmins.data.every((admin) =>
      admin.email.toLowerCase().includes(searchPattern.toLowerCase()),
    ),
  );
  // 5. Verify pagination metadata reflects filtered result count
  TestValidator.equals(
    "pagination records matches filtered data length",
    filteredAdmins.pagination.records,
    filteredAdmins.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      filteredAdmins.pagination.pages ===
      Math.ceil(
        filteredAdmins.pagination.records / filteredAdmins.pagination.limit,
      ),
  );
  // 6. Test with different search pattern to verify filtering works
  const differentPattern = "support";
  const supportAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          search: differentPattern,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(supportAdmins);
  // Verify all support results have 'support' in email
  TestValidator.predicate(
    "support filtered admins have search term in email",
    () =>
      supportAdmins.data.every((admin) =>
        admin.email.toLowerCase().includes(differentPattern.toLowerCase()),
      ),
  );
  // 7. Verify filtered results are subset of or equal to all admins
  TestValidator.predicate(
    "filtered count does not exceed total count",
    () => filteredAdmins.pagination.records <= allAdmins.pagination.records,
  );
  // 8. Test case-insensitivity by searching with uppercase
  const uppercasePattern = "ADMIN";
  const uppercaseSearchAdmins =
    await api.functional.shoppingMall.superAdministrator.administrators.index(
      superAdminConnection,
      {
        body: {
          search: uppercasePattern,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(uppercaseSearchAdmins);
  // Verify case-insensitive search returns same results
  TestValidator.equals(
    "case-insensitive search returns same count",
    uppercaseSearchAdmins.pagination.records,
    filteredAdmins.pagination.records,
  );
}
