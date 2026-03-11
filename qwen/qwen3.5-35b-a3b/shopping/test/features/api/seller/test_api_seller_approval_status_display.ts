import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_approval_status_display(
  connection: api.IConnection,
): Promise<void> {
  // Generate test seller IDs for different approval states
  const approvedSellerId = typia.random<string & tags.Format<"uuid">>();
  const pendingSellerId = typia.random<string & tags.Format<"uuid">>();
  const rejectedSellerId = typia.random<string & tags.Format<"uuid">>();
  const deletedSellerId = typia.random<string & tags.Format<"uuid">>();
  // Test approved seller - verify can view own account with correct status
  const approvedConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await api.functional.ecommerceMall.sellers.at(
    approvedConnection,
    { sellerId: approvedSellerId },
  );
  typia.assert(approvedSeller);
  // Validate approved seller has correct status and flags
  TestValidator.equals(
    "approved seller approval status",
    approvedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "approved seller rejection reason null",
    approvedSeller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approved seller not suspended",
    approvedSeller.is_suspended,
    false,
  );
  TestValidator.equals(
    "approved seller not banned",
    approvedSeller.is_banned,
    false,
  );
  // Test pending seller - verify status is pending with no rejection reason
  const pendingConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await api.functional.ecommerceMall.sellers.at(
    pendingConnection,
    { sellerId: pendingSellerId },
  );
  typia.assert(pendingSeller);
  // Validate pending seller has correct status
  TestValidator.equals(
    "pending seller approval status",
    pendingSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "pending seller rejection reason null",
    pendingSeller.rejection_reason,
    null,
  );
  // Test rejected seller - verify status is rejected with rejection reason
  const rejectedConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await api.functional.ecommerceMall.sellers.at(
    rejectedConnection,
    { sellerId: rejectedSellerId },
  );
  typia.assert(rejectedSeller);
  // Validate rejected seller has correct status with rejection reason populated
  TestValidator.equals(
    "rejected seller approval status",
    rejectedSeller.approval_status,
    "rejected",
  );
  TestValidator.predicate(
    "rejected seller has rejection reason populated",
    () =>
      rejectedSeller.rejection_reason !== null &&
      rejectedSeller.rejection_reason !== undefined,
  );
  // Test deleted seller - verify soft delete timestamp is present
  const deletedConnection: api.IConnection = { host: connection.host };
  const deletedSeller = await api.functional.ecommerceMall.sellers.at(
    deletedConnection,
    { sellerId: deletedSellerId },
  );
  typia.assert(deletedSeller);
  // Validate deleted seller has soft delete timestamp
  TestValidator.predicate(
    "deleted seller has deleted_at timestamp",
    () =>
      deletedSeller.deleted_at !== null &&
      deletedSeller.deleted_at !== undefined,
  );
  // Validate all sellers have required fields
  const sellers = [
    approvedSeller,
    pendingSeller,
    rejectedSeller,
    deletedSeller,
  ];
  for (const seller of sellers) {
    TestValidator.predicate("seller has valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seller.id,
      ),
    );
    TestValidator.predicate(
      "seller has created_at timestamp",
      () => seller.created_at !== undefined,
    );
    TestValidator.predicate(
      "seller has updated_at timestamp",
      () => seller.updated_at !== undefined,
    );
  }
  // Validate account state flags for different approval states
  TestValidator.equals(
    "approved seller suspended flag",
    approvedSeller.is_suspended,
    false,
  );
  TestValidator.equals(
    "approved seller banned flag",
    approvedSeller.is_banned,
    false,
  );
}
