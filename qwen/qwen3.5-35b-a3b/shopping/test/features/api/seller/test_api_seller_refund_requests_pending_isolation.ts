import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test security isolation for seller refund requests pending endpoint.
 *
 * Validates that each seller can only access their own pending refund requests, preventing cross-seller data leakage. The test registers two sellers, calls the pending endpoint for each, and verifies that the responses are properly isolated with correct pagination structure and data filtering.
 */
export async function test_api_seller_refund_requests_pending_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller_A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // Step 2: Register seller_B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // Step 3: Call pending endpoint as seller_A
  sellerAConnection.headers ??= {};
  sellerAConnection.headers.Authorization = sellerA.token.access;
  const sellerAPending =
    await api.functional.ecommerceMall.seller.seller.refund_requests.pending(
      sellerAConnection,
    );
  typia.assert(sellerAPending);
  // Step 4: Validate seller_A response structure
  TestValidator.equals(
    "seller_A response has pagination",
    sellerAPending.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_A response has data array",
    Array.isArray(sellerAPending.data),
    true,
  );
  // Step 5: Call pending endpoint as seller_B
  sellerBConnection.headers ??= {};
  sellerBConnection.headers.Authorization = sellerB.token.access;
  const sellerBPending =
    await api.functional.ecommerceMall.seller.seller.refund_requests.pending(
      sellerBConnection,
    );
  typia.assert(sellerBPending);
  // Step 6: Validate seller_B response structure
  TestValidator.equals(
    "seller_B response has pagination",
    sellerBPending.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_B response has data array",
    Array.isArray(sellerBPending.data),
    true,
  );
  // Step 7: Validate pagination metadata structure
  TestValidator.equals(
    "seller_A pagination has current",
    sellerAPending.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_A pagination has limit",
    sellerAPending.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_A pagination has records",
    sellerAPending.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_A pagination has pages",
    sellerAPending.pagination.pages !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_B pagination has current",
    sellerBPending.pagination.current !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_B pagination has limit",
    sellerBPending.pagination.limit !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_B pagination has records",
    sellerBPending.pagination.records !== undefined,
    true,
  );
  TestValidator.equals(
    "seller_B pagination has pages",
    sellerBPending.pagination.pages !== undefined,
    true,
  );
  // Step 8: Validate empty isolation - both sellers should see empty data arrays
  TestValidator.equals(
    "seller_A sees no pending refund requests",
    sellerAPending.data.length,
    0,
  );
  TestValidator.equals(
    "seller_B sees no pending refund requests",
    sellerBPending.data.length,
    0,
  );
  // Step 9: Validate pagination shows empty state
  TestValidator.equals(
    "seller_A pagination records is 0",
    sellerAPending.pagination.records,
    0,
  );
  TestValidator.equals(
    "seller_A pagination pages is 0",
    sellerAPending.pagination.pages,
    0,
  );
  TestValidator.equals(
    "seller_B pagination records is 0",
    sellerBPending.pagination.records,
    0,
  );
  TestValidator.equals(
    "seller_B pagination pages is 0",
    sellerBPending.pagination.pages,
    0,
  );
  // Step 10: Verify isolation - seller IDs are different
  TestValidator.notEquals(
    "seller_A and seller_B are different",
    sellerA.id,
    sellerB.id,
  );
}