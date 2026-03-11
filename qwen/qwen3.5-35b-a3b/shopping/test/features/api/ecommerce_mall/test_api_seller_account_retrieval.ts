import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create test sellers with different approval statuses
  // Since no utility function exists for seller creation, we'll generate mock seller data
  // that matches the expected response structure
  const approvedSellerId = typia.random<string & tags.Format<"uuid">>();
  const pendingSellerId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // Mock approved seller data (simulating database state for approved seller)
  const approvedSeller: IEcommerceMallSeller = {
    id: approvedSellerId,
    email: typia.random<string & tags.Format<"email">>(),
    approval_status: "approved",
    rejection_reason: null,
    is_suspended: false,
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // Mock pending seller data (simulating database state for pending seller)
  const pendingSeller: IEcommerceMallSeller = {
    id: pendingSellerId,
    email: typia.random<string & tags.Format<"email">>(),
    approval_status: "pending",
    rejection_reason: null,
    is_suspended: false,
    is_banned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 2. Test retrieved approved seller data
  // Note: Since we cannot create sellers via API (no utility or SDK function for creation),
  // we test the retrieval endpoint with mock data that simulates approved state
  const retrievedApprovedSeller = await api.functional.ecommerceMall.sellers.at(
    connection,
    {
      sellerId: approvedSellerId,
    },
  );
  typia.assert(retrievedApprovedSeller);
  TestValidator.equals(
    "approved seller id matches",
    retrievedApprovedSeller.id,
    approvedSellerId,
  );
  TestValidator.equals(
    "approved seller email matches",
    retrievedApprovedSeller.email,
    approvedSeller.email,
  );
  TestValidator.equals(
    "approved seller status is approved",
    retrievedApprovedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "approved seller rejection_reason is null",
    retrievedApprovedSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approved seller is_suspended is false",
    retrievedApprovedSeller.is_suspended,
    false,
  );
  TestValidator.equals(
    "approved seller is_banned is false",
    retrievedApprovedSeller.is_banned,
    false,
  );
  TestValidator.predicate(
    "approved seller has valid created_at timestamp",
    () => !isNaN(Date.parse(retrievedApprovedSeller.created_at)),
  );
  TestValidator.predicate(
    "approved seller has valid updated_at timestamp",
    () => !isNaN(Date.parse(retrievedApprovedSeller.updated_at)),
  );
  TestValidator.equals(
    "approved seller deleted_at is null",
    retrievedApprovedSeller.deleted_at,
    null,
  );
  // 3. Test retrieved pending seller data
  const retrievedPendingSeller = await api.functional.ecommerceMall.sellers.at(
    connection,
    {
      sellerId: pendingSellerId,
    },
  );
  typia.assert(retrievedPendingSeller);
  TestValidator.equals(
    "pending seller id matches",
    retrievedPendingSeller.id,
    pendingSellerId,
  );
  TestValidator.equals(
    "pending seller email matches",
    retrievedPendingSeller.email,
    pendingSeller.email,
  );
  TestValidator.equals(
    "pending seller status is pending",
    retrievedPendingSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "pending seller rejection_reason is null",
    retrievedPendingSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "pending seller is_suspended is false",
    retrievedPendingSeller.is_suspended,
    false,
  );
  TestValidator.equals(
    "pending seller is_banned is false",
    retrievedPendingSeller.is_banned,
    false,
  );
  TestValidator.predicate(
    "pending seller has valid created_at timestamp",
    () => !isNaN(Date.parse(retrievedPendingSeller.created_at)),
  );
  TestValidator.predicate(
    "pending seller has valid updated_at timestamp",
    () => !isNaN(Date.parse(retrievedPendingSeller.updated_at)),
  );
  TestValidator.equals(
    "pending seller deleted_at is null",
    retrievedPendingSeller.deleted_at,
    null,
  );
  // 4. Test rejection scenario: non-existent seller should return 404
  await TestValidator.httpError(
    "non-existent seller returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
