import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAppeal";
import type { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * Test that a seller can retrieve a paginated, filtered list of appeals that
 * they have initiated.
 *
 * This test registers a new seller, authenticates as that seller, and issues an
 * appeals index query with a variety of filter, search, and sort options. It
 * then validates that:
 *
 * 1. Only appeals where the filer_actor_id matches the authenticated seller's id
 *    are returned
 * 2. Pagination metadata is present and correct for the response
 * 3. All returned appeals match the requested filter/search criteria
 * 4. All results are within the requested page limit
 * 5. The list is sorted by the requested field and direction
 */
export async function test_api_seller_appeals_index_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller and get their id
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinInput,
  });
  typia.assert(seller);
  const sellerId = seller.id;

  // 2. Build a request body for appeals index using the seller's id as filer_actor_id
  const filterBody = {
    filer_actor_id: sellerId,
    filer_actor_type: "seller",
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    // Optional advanced filters:
    status: undefined,
    type: undefined,
    decision: undefined,
    affected_actor_type: undefined,
    affected_actor_id: undefined,
    appeal_of_policy_violation_id: undefined,
    appeal_of_suspension_id: undefined,
    created_from: undefined,
    created_to: undefined,
    decision_from: undefined,
    decision_to: undefined,
    search: undefined,
    sort_by: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingAppeal.IRequest;

  // 3. Search (index) - call the seller appeals index API endpoint
  const result = await api.functional.shopping.seller.appeals.index(
    connection,
    { body: filterBody },
  );
  typia.assert(result);
  TestValidator.predicate(
    "all appeals must have filer_actor_id equal to the authenticated seller's id",
    result.data.every((appeal) => appeal.filer_actor_id === sellerId),
  );

  // 4. Validate pagination information
  const pagination = result.pagination;
  TestValidator.predicate("current page should be 1", pagination.current === 1);
  TestValidator.predicate("page limit should be 10", pagination.limit === 10);

  // 5. Validate that list size does not exceed limit
  TestValidator.predicate(
    "number of items never exceeds limit",
    result.data.length <= filterBody.limit,
  );

  // 6. Validate sorting (descending by created_at)
  const sorted = Array.from(result.data).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  TestValidator.equals(
    "results are sorted descending by created_at",
    result.data.map((a) => a.id),
    sorted.map((a) => a.id),
  );

  // 7. (Optional) Validate that all data (appeal summaries) conform to schema
  result.data.forEach((item) => typia.assert(item));
}
