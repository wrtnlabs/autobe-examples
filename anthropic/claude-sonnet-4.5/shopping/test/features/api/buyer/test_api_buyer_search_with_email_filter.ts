import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test admin's ability to search and retrieve buyers by email address.
 *
 * This test validates the buyer search functionality with email filtering:
 *
 * 1. Create an admin account for authentication
 * 2. Create multiple buyer accounts with different email domains
 * 3. Search buyers using email filter as admin
 * 4. Validate that only matching buyers are returned
 * 5. Verify pagination metadata and buyer summary structure
 */
export async function test_api_buyer_search_with_email_filter(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple buyer accounts with different email patterns
  const searchDomain = "testdomain.com";
  const otherDomain = "otherdomain.com";

  const buyersData = [
    {
      emailPrefix: RandomGenerator.alphabets(6),
      domain: searchDomain,
      name: "Alice Smith",
    },
    {
      emailPrefix: RandomGenerator.alphabets(6),
      domain: otherDomain,
      name: "Bob Johnson",
    },
    {
      emailPrefix: RandomGenerator.alphabets(6),
      domain: searchDomain,
      name: "Charlie Brown",
    },
    {
      emailPrefix: RandomGenerator.alphabets(6),
      domain: otherDomain,
      name: "David Wilson",
    },
    {
      emailPrefix: RandomGenerator.alphabets(6),
      domain: searchDomain,
      name: "Eve Davis",
    },
  ];

  const expectedMatchingEmails: string[] = [];

  for (const buyerData of buyersData) {
    const buyerEmail = `${buyerData.emailPrefix}@${buyerData.domain}`;
    const buyerConnection: api.IConnection = { ...connection, headers: {} };

    const buyer: IShoppingMallBuyer.IAuthorized =
      await api.functional.auth.buyer.join(buyerConnection, {
        body: {
          email: buyerEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          full_name: buyerData.name,
          phone_number: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallBuyer.ICreate,
      });
    typia.assert(buyer);

    if (buyerEmail.includes(searchDomain)) {
      expectedMatchingEmails.push(buyerEmail);
    }
  }

  // Step 3: Search buyers by email filter (admin is already authenticated)
  const searchTerm = searchDomain;
  const searchResult: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate that all returned buyers match the search criteria
  TestValidator.predicate(
    "search should return at least the buyers we created with matching emails",
    searchResult.data.length >= expectedMatchingEmails.length,
  );

  // Step 5: Verify all returned buyers contain the search term in their email
  for (const buyerSummary of searchResult.data) {
    typia.assert(buyerSummary);

    TestValidator.predicate(
      "returned buyer email should contain search term",
      buyerSummary.email.includes(searchTerm),
    );
  }

  // Step 6: Validate pagination metadata
  typia.assert(searchResult.pagination);

  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);

  TestValidator.predicate(
    "pagination records should match or exceed data length",
    searchResult.pagination.records >= searchResult.data.length,
  );

  TestValidator.predicate(
    "pagination pages should be at least 1",
    searchResult.pagination.pages >= 1,
  );
}
