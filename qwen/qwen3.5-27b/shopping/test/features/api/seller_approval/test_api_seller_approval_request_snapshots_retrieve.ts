import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test retrieval of seller approval request snapshots with pagination and data validation.
 *
 * This test verifies that:
 * 1. Seller approval request snapshots are created at key workflow moments
 * 2. Snapshots can be retrieved with proper pagination
 * 3. Snapshot data contains complete request state as JSON
 * 4. Snapshots are sorted by creation timestamp (newest first)
 */
export async function test_api_seller_approval_request_snapshots_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // 2. Register and authenticate seller (utility updates connection headers internally)
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Create seller approval request (generates first snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 4. Retrieve snapshots for the approval request
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has at least 1 record",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 6. Validate snapshot data array
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshotsResponse.data.length >= 1,
  );
  // 7. Validate each snapshot structure
  await ArrayUtil.asyncForEach(snapshotsResponse.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate(
      `snapshot has valid UUID: ${snapshot.id}`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // Validate snapshot_data is a valid JSON string
    TestValidator.predicate(
      `snapshot_data is non-empty string: ${snapshot.id}`,
      snapshot.snapshot_data.length > 0,
    );
    // Parse snapshot_data to verify it contains complete request state
    const parsedData: {
      seller_id: string;
      reason: string;
      status: string;
      submitted_at: string;
      responded_at: string | null;
    } = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      `parsed snapshot_data has seller_id: ${snapshot.id}`,
      parsedData.seller_id !== undefined,
    );
    TestValidator.predicate(
      `parsed snapshot_data has reason: ${snapshot.id}`,
      parsedData.reason !== undefined,
    );
    TestValidator.predicate(
      `parsed snapshot_data has status: ${snapshot.id}`,
      parsedData.status !== undefined,
    );
    TestValidator.predicate(
      `parsed snapshot_data has submitted_at: ${snapshot.id}`,
      parsedData.submitted_at !== undefined,
    );
    TestValidator.predicate(
      `parsed snapshot_data has responded_at: ${snapshot.id}`,
      parsedData.responded_at !== undefined,
    );
  });
  // 8. Validate snapshots are sorted by created_at descending (newest first)
  if (snapshotsResponse.data.length >= 2) {
    for (const i of Array.from({
      length: snapshotsResponse.data.length - 1,
    }).keys()) {
      TestValidator.predicate(
        `snapshots sorted descending: index ${i} >= index ${i + 1}`,
        new Date(snapshotsResponse.data[i].created_at).getTime() >=
          new Date(snapshotsResponse.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 9. Verify first snapshot corresponds to initial submission (status='pending')
  const firstSnapshot = snapshotsResponse.data[0];
  const firstParsedData: {
    seller_id: string;
    reason: string;
    status: string;
    submitted_at: string;
    responded_at: string | null;
  } = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.equals(
    "first snapshot seller_id matches",
    firstParsedData.seller_id,
    seller.id,
  );
  TestValidator.equals(
    "first snapshot status is pending",
    firstParsedData.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reason matches",
    firstParsedData.reason,
    approvalRequest.reason,
  );
}
