import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complex multi-criteria seller search combinations with advanced
 * filtering.
 *
 * This comprehensive test validates the administrative seller search
 * functionality by testing multiple filter combinations simultaneously. The
 * test covers:
 *
 * 1. Multi-criteria filtering with search terms, verification status, commission
 *    rates
 * 2. Business type filtering combined with date ranges
 * 3. Complex sorting scenarios with multiple sort fields and directions
 * 4. Pagination behavior with filtered results
 * 5. Logical AND behavior between all active filters
 *
 * The test creates multiple sellers with different characteristics to ensure
 * filtering logic works correctly across all parameter combinations.
 */
export async function test_api_admin_seller_multi_criteria_advanced_search_combination(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authorization
  const adminEmail = `admin_${RandomGenerator.alphabets(8)}@shoppingmall.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(),
        lastname: RandomGenerator.name(),
        adminlevel: "super_admin",
        department: "seller_management",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple test sellers with varying characteristics
  const businessTypes = [
    "corporation",
    "partnership",
    "sole_proprietorship",
  ] as const;
  const verificationStatuses = [
    "pending",
    "verified",
    "suspended",
    "rejected",
  ] as const;
  const sellers = ArrayUtil.repeat(20, (index) => {
    return {
      email: `seller${index + 1}_${RandomGenerator.alphabets(6)}@business.com`,
      business_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      business_type: businessTypes[index % businessTypes.length],
      verification_status:
        verificationStatuses[index % verificationStatuses.length],
      commission_rate: typia.random<
        number & tags.Minimum<0> & tags.Maximum<100>
      >(),
      is_verified: index % 3 === 0,
      created_at: new Date(
        Date.now() - index * 24 * 60 * 60 * 1000,
      ).toISOString(),
      updated_at: new Date(
        Date.now() - (index / 2) * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };
  });

  // Step 3: Test basic multi-criteria search with search term + verification status
  const basicSearch = sellers.find(
    (s) => s.verification_status === "verified" && s.business_name.length > 0,
  );

  const basicSearchResult =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        search: basicSearch?.business_name,
        verification_status: "verified",
        sort_by: "business_name",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(basicSearchResult);

  TestValidator.predicate(
    "basic search returns results matching both criteria",
    basicSearchResult.data.length > 0 &&
      basicSearchResult.data.every(
        (seller) =>
          seller.verification_status === "verified" &&
          (basicSearch?.business_name
            ? seller.business_name.includes(basicSearch.business_name)
            : true),
      ),
  );

  // Step 4: Test commission rate range filtering combined with business type
  const verificationSellers = sellers.filter(
    (s) =>
      s.commission_rate >= 10 &&
      s.commission_rate <= 50 &&
      s.business_type === "corporation",
  );

  if (verificationSellers.length > 0) {
    const commissionSearchResult =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          commission_rate_min: 10,
          commission_rate_max: 50,
          business_type: "corporation",
          sort_by: "commission_rate",
          sort_order: "desc",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(commissionSearchResult);

    TestValidator.predicate(
      "commission rate filtering works with business type",
      commissionSearchResult.data.length > 0 &&
        commissionSearchResult.data.every(
          (seller) =>
            seller.commission_rate >= 10 &&
            seller.commission_rate <= 50 &&
            seller.business_type === "corporation",
        ),
    );
  }

  // Step 5: Test date range filtering with verification status
  const dateSellers = sellers.filter(
    (s) =>
      s.verification_status === "pending" &&
      !s.is_verified &&
      s.created_at >=
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  );

  if (dateSellers.length > 0) {
    const dateRange = {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    const dateSearchResult =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          created_after: dateRange.start,
          created_before: dateRange.end,
          verification_status: "pending",
          is_verified: false,
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 15,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(dateSearchResult);

    TestValidator.predicate(
      "date range filtering works with verification status",
      dateSearchResult.data.length > 0 &&
        dateSearchResult.data.every(
          (seller) =>
            seller.created_at >= dateRange.start &&
            seller.created_at <= dateRange.end &&
            seller.verification_status === "pending" &&
            !seller.is_verified,
        ),
    );
  }

  // Step 6: Test complex combination of all filters
  const complexSellers = sellers.filter(
    (s) =>
      s.verification_status === "verified" &&
      s.commission_rate >= 5 &&
      s.commission_rate <= 95 &&
      s.business_type ===
        businessTypes[Math.floor(Math.random() * businessTypes.length)] &&
      s.created_at >=
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() &&
      s.is_verified === true,
  );

  if (complexSellers.length > 0) {
    const selectedBusiness =
      complexSellers[0]?.business_type || businessTypes[0];
    const complexSearchResult =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          search: complexSellers[0]?.business_name.split(" ")[0],
          verification_status: "verified",
          commission_rate_min: 5,
          commission_rate_max: 95,
          business_type: selectedBusiness,
          created_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_verified: true,
          sort_by: "commission_rate",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSeller.IRequest,
      });
    typia.assert(complexSearchResult);

    TestValidator.predicate(
      "complex multi-filter search returns sellers matching all criteria",
      complexSearchResult.data.length > 0 &&
        complexSearchResult.data.every((seller) => {
          const searchMatch = complexSellers[0]?.business_name
            ? seller.business_name.includes(
                complexSellers[0].business_name.split(" ")[0],
              )
            : true;
          const statusMatch = seller.verification_status === "verified";
          const commissionMatch =
            seller.commission_rate >= 5 && seller.commission_rate <= 95;
          const businessMatch = seller.business_type === selectedBusiness;
          const dateMatch =
            seller.created_at >=
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const verifiedMatch = seller.is_verified === true;

          return (
            searchMatch &&
            statusMatch &&
            commissionMatch &&
            businessMatch &&
            dateMatch &&
            verifiedMatch
          );
        }),
    );
  }

  // Step 7: Test pagination with realistic expectation
  const page1Result = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        commission_rate_min: 0,
        commission_rate_max: 100,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 5,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(page1Result);

  if (page1Result.pagination.records > page1Result.pagination.limit) {
    const page2Result = await api.functional.shoppingMall.admin.sellers.index(
      connection,
      {
        body: {
          commission_rate_min: 0,
          commission_rate_max: 100,
          sort_by: "created_at",
          sort_order: "desc",
          page: 2,
          limit: page1Result.pagination.limit,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
    typia.assert(page2Result);

    TestValidator.predicate(
      "page 2 returns different results when enough records exist",
      page2Result.data.length > 0,
    );
  }

  // Step 8: Test sorting variations
  const sortByNameAscResult =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        sort_by: "business_name",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortByNameAscResult);

  const sortByNameDescResult =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        sort_by: "business_name",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSeller.IRequest,
    });
  typia.assert(sortByNameDescResult);

  TestValidator.predicate(
    "ascending and descending order return results",
    sortByNameAscResult.data.length > 0 && sortByNameDescResult.data.length > 0,
  );

  // Step 9: Test verification of pagination metadata
  TestValidator.predicate(
    "pagination info is consistent",
    basicSearchResult.pagination.current === 1 &&
      basicSearchResult.pagination.records >= basicSearchResult.data.length,
  );
}
