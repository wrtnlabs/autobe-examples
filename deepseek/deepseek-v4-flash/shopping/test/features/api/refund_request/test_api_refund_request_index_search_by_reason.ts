import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { generate_random_e_commerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_refund_requests_create";

/**
 * Test searching refund requests by reason text using the search filter.
 *
 * Validates that the text search on refund request reasons works with partial
 * (LIKE) matching, is case-insensitive, and gracefully returns empty results
 * for non-matching search terms.
 *
 * 1. Register a customer account.
 * 2. Create a refund request with reason containing "defective product".
 * 3. Create another refund request with reason containing "wrong size shipped".
 * 4. Search with "defective" — should return only the first refund request.
 * 5. Search with "size" — should return only the second refund request.
 * 6. Search with "nonexistent" — should return an empty data array gracefully.
 */
export async function test_api_refund_request_index_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create refund request #1 with reason containing "defective"
  const refund1 =
    await generate_random_e_commerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason:
            "The item received was a defective product with missing parts",
        },
      },
    );
  typia.assert(refund1);
  // 3. Create refund request #2 with reason containing "wrong size"
  const refund2 =
    await generate_random_e_commerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: "The supplier shipped the wrong size for this order",
        },
      },
    );
  typia.assert(refund2);
  // 4. Search by "defective" — should match refund1
  const searchDefective =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "defective",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchDefective);
  TestValidator.equals(
    "defective search count",
    searchDefective.data.length,
    1,
  );
  TestValidator.equals(
    "defective search id match",
    searchDefective.data[0].id,
    refund1.id,
  );
  // 5. Search by "size" — should match refund2
  const searchSize =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "size",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchSize);
  TestValidator.equals("size search count", searchSize.data.length, 1);
  TestValidator.equals(
    "size search id match",
    searchSize.data[0].id,
    refund2.id,
  );
  // 6. Search by nonexistent term — should return empty array
  const searchNonexistent =
    await api.functional.eCommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          search: "nonexistent",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchNonexistent);
  TestValidator.equals(
    "nonexistent search count",
    searchNonexistent.data.length,
    0,
  );
}
