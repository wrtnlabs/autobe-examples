import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

export async function test_api_buyer_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Step 2: Create baseline buyer accounts with known data
  const buyerData = await ArrayUtil.asyncRepeat(3, async (index) => {
    const buyerEmail = `testbuyer${index + 1}@example.com`;
    const buyerName = `Test Buyer ${index + 1}`;

    const buyer: IShoppingMallBuyer.IAuthorized =
      await api.functional.auth.buyer.join(connection, {
        body: {
          email: buyerEmail,
          password: "testpassword123",
          full_name: buyerName,
          phone_number: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallBuyer.ICreate,
      });
    typia.assert(buyer);

    return { email: buyerEmail, name: buyerName, id: buyer.id };
  });

  // Re-authenticate as admin for search operations
  await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 3: Search with non-matching email term
  const emptyResultEmail: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: "nonexistent@nowhere.com",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(emptyResultEmail);

  TestValidator.equals(
    "empty result email - data array is empty",
    emptyResultEmail.data,
    [],
  );
  TestValidator.equals(
    "empty result email - records is 0",
    emptyResultEmail.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result email - pages is 0",
    emptyResultEmail.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty result email - current page is valid",
    emptyResultEmail.pagination.current >= 0,
  );
  TestValidator.predicate(
    "empty result email - limit is valid",
    emptyResultEmail.pagination.limit > 0,
  );

  // Step 4: Search with non-matching name term
  const emptyResultName: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: "ZzZzNobodyHasThisName",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(emptyResultName);

  TestValidator.equals(
    "empty result name - data array is empty",
    emptyResultName.data,
    [],
  );
  TestValidator.equals(
    "empty result name - records is 0",
    emptyResultName.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result name - pages is 0",
    emptyResultName.pagination.pages,
    0,
  );

  // Step 5: Search with completely random string
  const randomSearchTerm = RandomGenerator.alphaNumeric(20);
  const emptyResultRandom: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        search: randomSearchTerm,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(emptyResultRandom);

  TestValidator.equals(
    "empty result random - data array is empty",
    emptyResultRandom.data,
    [],
  );
  TestValidator.equals(
    "empty result random - records is 0",
    emptyResultRandom.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result random - pages is 0",
    emptyResultRandom.pagination.pages,
    0,
  );
}
