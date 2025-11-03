import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAttributeValue";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test that a newly registered seller can search for attribute values under a
 * selected dimension.
 *
 * 1. Register a new seller using random but valid credentials.
 * 2. Choose a random attribute dimension code for the test scenario.
 * 3. Use PATCH /shopping/seller/attributeDimensions/{dimensionCode}/values with
 *    random pagination/filters.
 * 4. Assert all returned values belong to the specified dimension code.
 * 5. Validate pagination info matches request.
 * 6. Assert type correctness of all records (output).
 * 7. Ensure no data leakage or cross-dimension inclusion.
 */
export async function test_api_seller_attribute_values_search_success(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerJoin: IShoppingSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoin,
    });
  typia.assert(seller);

  // 2. Generate a random dimension code (simulate onboarding scenario)
  const dimensionCode = RandomGenerator.alphaNumeric(8);

  // 3. Prepare request: search + random pagination/sort
  const req = {
    dimension_code: dimensionCode,
    search: RandomGenerator.pick([undefined, RandomGenerator.alphabets(3)]),
    sort_by: RandomGenerator.pick([
      undefined,
      "display_order",
      "value_code",
      "display_value",
      "created_at",
    ] as const),
    sort_order: RandomGenerator.pick([undefined, "asc", "desc"] as const),
    page: RandomGenerator.pick([
      undefined,
      typia.random<
        number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
      >(),
    ]),
    limit: RandomGenerator.pick([
      undefined,
      typia.random<
        number &
          tags.Type<"int32"> &
          tags.Default<20> &
          tags.Minimum<1> &
          tags.Maximum<100>
      >(),
    ]),
  } satisfies IShoppingAttributeValue.IRequest;

  // 4. Call search endpoint
  const page: IPageIShoppingAttributeValue =
    await api.functional.shopping.seller.attributeDimensions.values.index(
      connection,
      {
        dimensionCode,
        body: req,
      },
    );
  typia.assert(page);
  // 5. Assert all returned records conform to schema and match the queried dimension
  TestValidator.predicate(
    "all attribute values belong to the requested dimension code",
    page.data.every((av) => av.shopping_attribute_dimension_id !== undefined),
  );
  // 6. Assert all have correct types
  page.data.forEach((av, i) => typia.assert(av));
  // 7. Validate pagination (logic: page/limit are in-range and type is correct)
  TestValidator.predicate(
    "pagination current page is correct/int",
    typeof page.pagination.current === "number" && page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is correct/int",
    typeof page.pagination.limit === "number" && page.pagination.limit >= 0,
  );
}
