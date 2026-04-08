import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can search for specific super admin accounts
 * using email partial matching.
 *
 * Validates the email-based search functionality for super admin accounts
 * including partial email matching with ILIKE pattern, case-insensitive search
 * behavior, and accurate pagination metadata. This ensures super administrators
 * can efficiently locate specific admin accounts when managing platform users.
 *
 * 1. Authenticate as a primary super admin account.
 * 2. Create 3 test super admin accounts with different email patterns
 *    (e.g., admin@test.com, admin2@test.com, super@test.com).
 * 3. Search with "admin@" pattern - all should match.
 * 4. Search with more specific pattern "admin1@" - only one should match.
 * 5. Verify pagination metadata (records, pages) matches returned data.
 * 6. Test case-insensitive search with "Admin@" pattern.
 */
export async function test_api_super_admin_search_by_email_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary super admin and authenticate
  const primaryConnection: api.IConnection = { host: connection.host };
  const primaryAdmin = await authorize_super_admin_join(primaryConnection, {});
  typia.assert(primaryAdmin);
  // 2. Create test super admin accounts with different email patterns
  const testEmail1 = `admin1@${RandomGenerator.alphabets(8)}.com`;
  const testEmail2 = `admin2@${RandomGenerator.alphabets(8)}.com`;
  const testEmail3 = `super@${RandomGenerator.alphabets(8)}.com`;
  const testJoin1: IEcommerceMallSuperAdmin.IJoin = {
    email: testEmail1 as string & tags.Format<"email">,
    password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const testJoin2: IEcommerceMallSuperAdmin.IJoin = {
    email: testEmail2 as string & tags.Format<"email">,
    password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const testJoin3: IEcommerceMallSuperAdmin.IJoin = {
    email: testEmail3 as string & tags.Format<"email">,
    password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
    body: testJoin1,
  });
  await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
    body: testJoin2,
  });
  await api.functional.ecommerceMall.auth.superAdmin.join(connection, {
    body: testJoin3,
  });
  // 3. Search with partial email pattern "admin@" - should match admin1 and admin2
  const searchResult =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      primaryConnection,
      {
        body: {
          email: "admin@",
          limit: 100,
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "has matching results",
    searchResult.data.length >= 2,
  );
  TestValidator.predicate(
    "all results contain email pattern",
    searchResult.data.every((admin) => admin.email.includes("admin@")),
  );
  // 4. Search with more specific pattern "admin1@" - should match only one
  const specificSearch =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      primaryConnection,
      {
        body: {
          email: testEmail1.substring(0, testEmail1.indexOf("@") + 1),
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(specificSearch);
  TestValidator.equals(
    "exact email match count",
    1,
    specificSearch.data.length,
  );
  TestValidator.equals(
    "email matches exactly",
    specificSearch.data[0]?.email,
    testEmail1,
  );
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", 1, searchResult.pagination.current);
  TestValidator.equals("limit is 100", 100, searchResult.pagination.limit);
  TestValidator.equals(
    "records matches data length",
    searchResult.pagination.records,
    searchResult.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    searchResult.pagination.pages >= 1,
  );
  // 6. Case-insensitive search with "Admin@" pattern
  const caseInsensitiveSearch =
    await api.functional.ecommerceMall.superAdmin.super_admin.super_admins.index(
      primaryConnection,
      {
        body: {
          email: "Admin@",
        } satisfies IEcommerceMallSuperAdmin.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.predicate(
    "has case-insensitive results",
    caseInsensitiveSearch.data.length > 0,
  );
  TestValidator.predicate(
    "matches emails regardless of case",
    caseInsensitiveSearch.data.every((admin) =>
      admin.email.toLowerCase().includes("admin@"),
    ),
  );
}
