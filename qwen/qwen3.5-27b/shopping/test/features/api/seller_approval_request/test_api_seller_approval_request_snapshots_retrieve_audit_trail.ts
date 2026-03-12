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
 * Test retrieval of seller approval request snapshots for audit trail.
 *
 * This test validates the complete audit trail functionality for seller approval requests:
 * 1. Register a new seller account
 * 2. Create a seller approval request (triggers initial snapshot creation)
 * 3. Retrieve snapshots for the approval request
 * 4. Validate pagination metadata and snapshot data structure
 * 5. Verify snapshots are sorted by creation timestamp (newest first)
 * 6. Confirm snapshot_data contains complete JSON state of the approval request
 */
export async function test_api_seller_approval_request_snapshots_retrieve_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller approval request (triggers initial snapshot)
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 3. Retrieve snapshots for the approval request
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort_order: "desc",
        } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate pagination metadata
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
    "pagination has at least one snapshot",
    snapshotsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshotsResponse.pagination.pages >= 1,
  );
  // 5. Validate snapshots array
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshotsResponse.data.length >= 1,
  );
  // 6. Validate each snapshot structure
  await ArrayUtil.asyncForEach(snapshotsResponse.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate required fields exist
    TestValidator.predicate(
      `snapshot has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      `snapshot has non-empty snapshot_data`,
      snapshot.snapshot_data.length > 0,
    );
    TestValidator.predicate(
      `snapshot has valid created_at timestamp`,
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9]/.test(
        snapshot.created_at,
      ),
    );
    // Validate snapshot_data is valid JSON containing expected fields
    const parsedSnapshotData = JSON.parse(snapshot.snapshot_data);
    TestValidator.predicate(
      `snapshot_data contains seller_id`,
      "seller_id" in parsedSnapshotData,
    );
    TestValidator.predicate(
      `snapshot_data contains reason`,
      "reason" in parsedSnapshotData,
    );
    TestValidator.predicate(
      `snapshot_data contains status`,
      "status" in parsedSnapshotData,
    );
    TestValidator.predicate(
      `snapshot_data contains submitted_at`,
      "submitted_at" in parsedSnapshotData,
    );
    TestValidator.predicate(
      `snapshot_data contains responded_at`,
      "responded_at" in parsedSnapshotData,
    );
    // Validate seller_id matches the approval request's seller
    TestValidator.equals(
      `snapshot seller_id matches approval request seller`,
      parsedSnapshotData.seller_id,
      sellerAuth.id,
    );
  });
  // 7. Validate snapshots are sorted by created_at (descending - newest first)
  if (snapshotsResponse.data.length >= 2) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than snapshot ${i - 1}`,
        new Date(snapshotsResponse.data[i].created_at).getTime() <=
          new Date(snapshotsResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
  // 8. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.seller.sellerApprovalRequests.snapshots.index(
      sellerConnection,
      {
        requestId: approvalRequest.id,
        body: {
          page: 1,
          limit: 10,
          sort_order: "asc",
        } satisfies IShoppingMallSellerApprovalSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "paginated response limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "paginated response current page",
    paginatedResponse.pagination.current,
    1,
  );
  // Validate ascending sort order
  if (paginatedResponse.data.length >= 2) {
    for (let i = 1; i < paginatedResponse.data.length; i++) {
      TestValidator.predicate(
        `ascending sort: snapshot ${i} is not older than snapshot ${i - 1}`,
        new Date(paginatedResponse.data[i].created_at).getTime() >=
          new Date(paginatedResponse.data[i - 1].created_at).getTime(),
      );
    }
  }
}
