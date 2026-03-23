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
 * Test snapshot immutability and dispute resolution support for seller approval requests.
 *
 * This test verifies that seller approval request snapshots are properly created,
 * immutable, and provide sufficient audit trail for dispute resolution.
 */
export async function test_api_seller_approval_request_snapshots_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create first approval request with initial reason
  const firstRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Initial application for selling electronics and gadgets",
        },
      },
    );
  typia.assert(firstRequest);
  // 3. Create second approval request (simulating resubmission after rejection)
  const secondRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason:
            "Updated application with business license and improved product catalog",
        },
      },
    );
  typia.assert(secondRequest);
  // 4. Retrieve snapshots for the first approval request
  const firstSnapshots =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: firstRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort_order: "asc",
        },
      },
    );
  typia.assert(firstSnapshots);
  // 5. Retrieve snapshots for the second approval request
  const secondSnapshots =
    await api.functional.shoppingMall.seller.seller_approval_requests.snapshots.index(
      sellerConnection,
      {
        requestId: secondRequest.id,
        body: {
          page: 1,
          limit: 100,
          sort_order: "asc",
        },
      },
    );
  typia.assert(secondSnapshots);
  // 6. Verify snapshot count for first request (should have at least 1 snapshot for submission)
  TestValidator.predicate(
    "first request has snapshots",
    firstSnapshots.data.length >= 1,
  );
  // 7. Verify snapshot count for second request (should have at least 1 snapshot for submission)
  TestValidator.predicate(
    "second request has snapshots",
    secondSnapshots.data.length >= 1,
  );
  // 8. Verify chronological ordering (snapshots sorted by created_at in ascending order)
  for (let i = 1; i < firstSnapshots.data.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} created after snapshot ${i - 1}`,
      new Date(firstSnapshots.data[i].created_at).getTime() >=
        new Date(firstSnapshots.data[i - 1].created_at).getTime(),
    );
  }
  // 9. Verify each snapshot contains valid JSON data
  for (const snapshot of firstSnapshots.data) {
    const parsedData = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      "snapshot contains valid JSON",
      typeof parsedData === "object" && parsedData !== null,
    );
    // 10. Verify required fields in snapshot data
    TestValidator.equals(
      "snapshot has seller_id",
      "seller_id" in parsedData,
      true,
    );
    TestValidator.equals("snapshot has reason", "reason" in parsedData, true);
    TestValidator.equals("snapshot has status", "status" in parsedData, true);
    TestValidator.equals(
      "snapshot has submitted_at",
      "submitted_at" in parsedData,
      true,
    );
    TestValidator.equals(
      "snapshot has responded_at",
      "responded_at" in parsedData,
      true,
    );
  }
  // 11. Verify first snapshot matches original submission
  const firstSnapshot = firstSnapshots.data[0];
  const firstSnapshotData = JSON.parse(firstSnapshot.snapshot_data);
  TestValidator.equals(
    "first snapshot reason matches original",
    firstSnapshotData.reason,
    "Initial application for selling electronics and gadgets",
  );
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshotData.status,
    "pending",
  );
  // 12. Verify second request has different reason (dispute resolution evidence)
  const secondSnapshot = secondSnapshots.data[0];
  const secondSnapshotData = JSON.parse(secondSnapshot.snapshot_data);
  TestValidator.notEquals(
    "second request has different reason",
    secondSnapshotData.reason,
    firstSnapshotData.reason,
  );
  TestValidator.equals(
    "second snapshot reason matches updated",
    secondSnapshotData.reason,
    "Updated application with business license and improved product catalog",
  );
  // 13. Verify seller_id consistency across snapshots
  TestValidator.equals(
    "seller_id matches in first snapshot",
    firstSnapshotData.seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller_id matches in second snapshot",
    secondSnapshotData.seller_id,
    sellerAuth.id,
  );
  // 14. Verify pagination metadata
  TestValidator.equals(
    "first snapshots pagination current page",
    firstSnapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "second snapshots pagination current page",
    secondSnapshots.pagination.current,
    1,
  );
  TestValidator.predicate(
    "first snapshots has correct records count",
    firstSnapshots.pagination.records === firstSnapshots.data.length,
  );
  TestValidator.predicate(
    "second snapshots has correct records count",
    secondSnapshots.pagination.records === secondSnapshots.data.length,
  );
}
