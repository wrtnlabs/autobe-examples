import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin search functionality with email filtering capability.
 *
 * This test validates that administrators can search for other admins using
 * email-based filtering, which is essential for organizational admin
 * management. The test creates multiple admin accounts with different email
 * domains and verifies that email filtering returns accurate, filtered
 * results.
 *
 * Test workflow:
 *
 * 1. Create multiple admin accounts with varied email addresses across different
 *    domains
 * 2. Authenticate as a super admin to gain search permissions
 * 3. Test full email address search (exact match)
 * 4. Test partial email matching (substring search)
 * 5. Test domain-based filtering (e.g., all admins from @company.com)
 * 6. Validate pagination structure and filtered results accuracy
 */
export async function test_api_admin_search_by_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create multiple admin accounts with diverse email addresses
  const emailDomains = [
    "company.com",
    "support.com",
    "admin.com",
    "example.org",
  ] as const;
  const adminLevels = ["super_admin", "moderator", "support"] as const;

  const createdAdmins: IShoppingMallAdmin.IAuthorized[] = [];

  // Create 6 admin accounts with controlled domain distribution
  for (let i = 0; i < 6; i++) {
    const domain = emailDomains[i % emailDomains.length];
    const adminLevel = adminLevels[i % adminLevels.length];
    const username = RandomGenerator.alphaNumeric(8).toLowerCase();

    const adminData = {
      email: `${username}@${domain}`,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: adminLevel,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate;

    const admin = await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
    typia.assert(admin);
    createdAdmins.push(admin);
  }

  // Step 2: Connection is already authenticated from the last join() call
  // The authentication token is automatically managed by the SDK

  // Step 3: Test full email search (exact match)
  const targetAdmin = createdAdmins[2];

  const exactEmailSearch = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        email: targetAdmin.email,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(exactEmailSearch);

  // Validate exact email match returns correct admin
  TestValidator.predicate(
    "exact email search should return at least one result",
    exactEmailSearch.data.length >= 1,
  );

  const foundExactAdmin = exactEmailSearch.data.find(
    (admin) => admin.email === targetAdmin.email,
  );
  typia.assertGuard(foundExactAdmin!);

  TestValidator.equals(
    "exact email search should match target admin email",
    foundExactAdmin.email,
    targetAdmin.email,
  );

  // Step 4: Test partial email matching (username search)
  const username = targetAdmin.email.split("@")[0];

  const partialEmailSearch =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        email: username,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(partialEmailSearch);

  // Validate all returned admins contain the username string
  TestValidator.predicate(
    "partial email search should return results",
    partialEmailSearch.data.length > 0,
  );

  for (const admin of partialEmailSearch.data) {
    TestValidator.predicate(
      `admin email should contain username '${username}'`,
      admin.email.includes(username),
    );
  }

  // Step 5: Test domain-based filtering
  const testDomain = "company.com";
  const companyAdmins = createdAdmins.filter((admin) =>
    admin.email.endsWith(testDomain),
  );

  if (companyAdmins.length > 0) {
    const domainSearch = await api.functional.shoppingMall.admin.admins.index(
      connection,
      {
        body: {
          email: testDomain,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
    typia.assert(domainSearch);

    // Validate domain filtering returns only admins from that domain
    TestValidator.predicate(
      "domain search should return results",
      domainSearch.data.length > 0,
    );

    for (const admin of domainSearch.data) {
      TestValidator.predicate(
        `admin email should contain domain '${testDomain}'`,
        admin.email.includes(testDomain),
      );
    }
  }

  // Step 6: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid current page",
    exactEmailSearch.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have valid limit",
    exactEmailSearch.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    exactEmailSearch.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    exactEmailSearch.pagination.pages >= 0,
  );
}
