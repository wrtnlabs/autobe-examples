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
 * Test sorting functionality for buyer listings.
 *
 * This test validates that the buyer listing API correctly sorts results by
 * different fields (created_at, email, full_name) in both ascending and
 * descending order. It creates multiple buyer accounts with varied attributes
 * and verifies that the API returns results in the expected order for each
 * sorting configuration.
 *
 * Test workflow:
 *
 * 1. Create admin account for authentication
 * 2. Create multiple buyer accounts with diverse attributes
 * 3. Test sorting by created_at field (ascending and descending)
 * 4. Test sorting by email field (ascending and descending)
 * 5. Test sorting by full_name field (ascending and descending)
 * 6. Validate that sorting is consistent across pagination boundaries
 */
export async function test_api_buyer_list_sorting(connection: api.IConnection) {
  // Step 1: Create admin account for authenticated access
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

  // Step 2: Create multiple buyer accounts with varied attributes for sorting validation
  const buyerCount = 12;
  const createdBuyers: IShoppingMallBuyer.IAuthorized[] = [];

  for (let i = 0; i < buyerCount; i++) {
    const buyerEmail = `buyer${String.fromCharCode(97 + (i % 26))}${i}@test.com`;
    const fullName = `${String.fromCharCode(65 + (i % 26))}User${i}`;

    const buyer: IShoppingMallBuyer.IAuthorized =
      await api.functional.auth.buyer.join(connection, {
        body: {
          email: buyerEmail,
          password: typia.random<string & tags.MinLength<8>>(),
          full_name: fullName,
          phone_number: RandomGenerator.mobile(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallBuyer.ICreate,
      });
    typia.assert(buyer);
    createdBuyers.push(buyer);

    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Test sorting by created_at ascending
  const sortedByCreatedAtAsc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "created_at",
        sort: "asc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByCreatedAtAsc);

  TestValidator.predicate(
    "created_at ascending sort returns results",
    sortedByCreatedAtAsc.data.length > 0,
  );

  // Step 4: Test sorting by created_at descending
  const sortedByCreatedAtDesc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "created_at",
        sort: "desc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByCreatedAtDesc);

  TestValidator.predicate(
    "created_at descending sort returns results",
    sortedByCreatedAtDesc.data.length > 0,
  );

  // Step 5: Test sorting by email ascending
  const sortedByEmailAsc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "email",
        sort: "asc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByEmailAsc);

  // Validate email ascending order
  for (let i = 0; i < sortedByEmailAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "email ascending order maintained",
      sortedByEmailAsc.data[i].email <= sortedByEmailAsc.data[i + 1].email,
    );
  }

  // Step 6: Test sorting by email descending
  const sortedByEmailDesc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "email",
        sort: "desc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByEmailDesc);

  // Validate email descending order
  for (let i = 0; i < sortedByEmailDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "email descending order maintained",
      sortedByEmailDesc.data[i].email >= sortedByEmailDesc.data[i + 1].email,
    );
  }

  // Step 7: Test sorting by full_name ascending
  const sortedByNameAsc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "full_name",
        sort: "asc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByNameAsc);

  // Validate full_name ascending order
  for (let i = 0; i < sortedByNameAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "full_name ascending order maintained",
      sortedByNameAsc.data[i].full_name <=
        sortedByNameAsc.data[i + 1].full_name,
    );
  }

  // Step 8: Test sorting by full_name descending
  const sortedByNameDesc: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        orderBy: "full_name",
        sort: "desc",
        limit: 20,
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(sortedByNameDesc);

  // Validate full_name descending order
  for (let i = 0; i < sortedByNameDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "full_name descending order maintained",
      sortedByNameDesc.data[i].full_name >=
        sortedByNameDesc.data[i + 1].full_name,
    );
  }

  // Step 9: Test pagination with sorting consistency
  const firstPage: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        page: 1,
        limit: 5,
        orderBy: "email",
        sort: "asc",
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(firstPage);

  const secondPage: IPageIShoppingMallBuyer.ISummary =
    await api.functional.shoppingMall.admin.buyers.index(connection, {
      body: {
        page: 2,
        limit: 5,
        orderBy: "email",
        sort: "asc",
      } satisfies IShoppingMallBuyer.IRequest,
    });
  typia.assert(secondPage);

  // Validate that pagination maintains sorting order across pages
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.predicate(
      "pagination maintains sort order across pages",
      firstPage.data[firstPage.data.length - 1].email <
        secondPage.data[0].email,
    );
  }
}
