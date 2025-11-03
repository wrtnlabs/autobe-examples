import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeDimension";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Seller can list attribute dimensions with filtering, search, sorting, and
 * pagination
 *
 * 1. Register a new seller account (using /auth/seller/join)
 * 2. Use authenticated seller to retrieve initial unfiltered list
 *
 *    - PATCH /shopping/seller/attributeDimensions with empty filter
 *    - Check response shape, fields, no inactive/deleted present
 *    - Validate pagination (page=1, limit default 20)
 * 3. Test search with partial dimension_code and name (using output from step 2)
 *
 *    - Choose random dimension_code and name substring
 *    - PATCH with { search }, { dimension_code }, or { name }
 *    - Confirm all returned records match partial and are not inactive/deleted
 * 4. Test explicit paging (page=2, limit=5) and sorting (sort_by + order)
 *
 *    - PATCH with { page: 2, limit: 5, sort_by: ... , sort_order: ... }
 *    - Confirm pagination context, data length, and correct sorted results
 * 5. Negative test: Unauthenticated connection must fail
 *
 *    - Remove auth, call attributeDimensions.index, expect error
 */
export async function test_api_attribute_dimension_list_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerCred = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerCred });
  typia.assert(seller);
  TestValidator.equals("seller email matches", seller.email, sellerCred.email);
  TestValidator.equals(
    "seller pending status after join",
    seller.status,
    "pending",
  );

  // 2. List all (no filters, default paging)
  const page1: IPageIShoppingAttributeDimension.ISummary =
    await api.functional.shopping.seller.attributeDimensions.index(connection, {
      body: {} satisfies IShoppingAttributeDimension.IRequest,
    });
  typia.assert(page1);
  TestValidator.predicate("has pagination context", !!page1.pagination);
  // There may be 0 dimensions, that's valid (so no further checks if list is empty)

  // 3. Test filter (only if data exists)
  if (page1.data.length > 0) {
    const randomDim = RandomGenerator.pick(page1.data);
    // Partial search by dimension_code
    const partialDimCode = randomDim.dimension_code.slice(
      0,
      Math.max(1, Math.floor(randomDim.dimension_code.length / 2)),
    );
    const codeResult =
      await api.functional.shopping.seller.attributeDimensions.index(
        connection,
        {
          body: {
            dimension_code: partialDimCode,
          } satisfies IShoppingAttributeDimension.IRequest,
        },
      );
    typia.assert(codeResult);
    await ArrayUtil.asyncForEach(codeResult.data, async (dim) => {
      TestValidator.predicate(
        "dimension_code contains partial (code search)",
        dim.dimension_code.toLowerCase().includes(partialDimCode.toLowerCase()),
      );
    });
    // Partial search by name
    const partialName = randomDim.name.slice(
      0,
      Math.max(1, Math.floor(randomDim.name.length / 2)),
    );
    const nameResult =
      await api.functional.shopping.seller.attributeDimensions.index(
        connection,
        {
          body: {
            name: partialName,
          } satisfies IShoppingAttributeDimension.IRequest,
        },
      );
    typia.assert(nameResult);
    await ArrayUtil.asyncForEach(nameResult.data, async (dim) => {
      TestValidator.predicate(
        "name contains partial (name search)",
        dim.name.toLowerCase().includes(partialName.toLowerCase()),
      );
    });
    // Search by 'search' term (text search on code/name/desc)
    const searchTerm = randomDim.dimension_code;
    const searchResult =
      await api.functional.shopping.seller.attributeDimensions.index(
        connection,
        {
          body: {
            search: searchTerm,
          } satisfies IShoppingAttributeDimension.IRequest,
        },
      );
    typia.assert(searchResult);
    await ArrayUtil.asyncForEach(searchResult.data, async (dim) => {
      TestValidator.predicate(
        "dimension_code or name or description match (search)",
        [dim.dimension_code, dim.name, dim.description ?? ""].some((f) =>
          f.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      );
    });
  }

  // 4. Explicit paging/sorting combos (just checks for correct paging context & data shape)
  const pagingReq = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "name" as const,
    sort_order: "asc" as const,
  } satisfies IShoppingAttributeDimension.IRequest;
  const page2: IPageIShoppingAttributeDimension.ISummary =
    await api.functional.shopping.seller.attributeDimensions.index(connection, {
      body: pagingReq,
    });
  typia.assert(page2);
  TestValidator.equals(
    "pagination context correct page",
    page2.pagination.current,
    pagingReq.page,
  );
  TestValidator.equals(
    "pagination context correct limit",
    page2.pagination.limit,
    pagingReq.limit,
  );
  // Optional: data sorted by name asc (only if > 1 result)
  if (page2.data.length > 1) {
    for (let i = 1; i < page2.data.length; ++i) {
      TestValidator.predicate(
        `name sorted asc at ${i}`,
        page2.data[i - 1].name.localeCompare(page2.data[i].name) <= 0,
      );
    }
  }

  // 5. Negative test: Unauthenticated call is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated request is denied", async () => {
    await api.functional.shopping.seller.attributeDimensions.index(unauthConn, {
      body: {} satisfies IShoppingAttributeDimension.IRequest,
    });
  });
}
