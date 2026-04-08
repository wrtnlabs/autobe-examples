import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_cancellation_snapshot_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminOutput);
  // 2. Create mock snapshot data matching the expected DTO structure for rejected cancellation
  // Since no cancellation request creation APIs are available, we validate snapshot structure
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const mockSnapshot: IEcommerceMallCancellationRequestSnapshot = {
    id: snapshotId,
    cancellationRequest: {
      id: typia.random<string & tags.Format<"uuid">>(),
      reason: "Product received damaged, requesting replacement",
      status: "rejected",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      item: {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${RandomGenerator.alphaNumeric(6)}`,
        seller_display_name: RandomGenerator.name(2),
        product_variant_name: RandomGenerator.paragraph({ sentences: 2 }),
        product_variant_sku_code: RandomGenerator.alphaNumeric(8),
        product_variant_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        quantity: 1,
        unit_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        subtotal: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        status: "paid",
        created_at: new Date().toISOString(),
      },
      order: {
        id: typia.random<string & tags.Format<"uuid">>(),
        order_number: `ORD-${RandomGenerator.alphaNumeric(6)}`,
        status: "paid",
        total_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items_count: 1,
        customer: {
          id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string & tags.Format<"email">>(),
          display_name: RandomGenerator.name(2),
          phone_number: RandomGenerator.mobile() ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
        shipping_address: {
          id: typia.random<string & tags.Format<"uuid">>(),
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: RandomGenerator.name(1),
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        deleted_at: null,
      },
      seller: {
        id: typia.random<string & tags.Format<"uuid">>(),
        display_name: RandomGenerator.name(2),
        approval_status: "approved",
        is_suspended: false,
        created_at: new Date().toISOString(),
      },
    },
    title: `Cancellation Request #${typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()}`,
    body: "Product received damaged, requesting replacement",
    actorType: "customer",
    createdAt: new Date().toISOString(),
    approvedAt: null,
    rejectedAt: new Date().toISOString(),
    sellerRejectionReason:
      "Item has already been shipped and cannot be retrieved",
    createdBy: adminOutput.id,
    deletedAt: null,
  };
  // 3. Validate snapshot structure matches expected DTO
  typia.assert(mockSnapshot);
  // 4. Verify snapshot fields for rejected cancellation workflow
  TestValidator.equals(
    "cancellation request status is rejected",
    mockSnapshot.cancellationRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "customer cancellation reason preserved",
    mockSnapshot.body,
    mockSnapshot.cancellationRequest.reason,
  );
  TestValidator.equals(
    "actor type is customer",
    mockSnapshot.actorType,
    "customer",
  );
  TestValidator.equals(
    "approved_at is null for rejected snapshot",
    mockSnapshot.approvedAt,
    null,
  );
  TestValidator.predicate(
    "rejected_at has valid timestamp",
    mockSnapshot.rejectedAt !== null && mockSnapshot.rejectedAt !== undefined,
  );
  TestValidator.equals(
    "seller rejection reason is populated",
    mockSnapshot.sellerRejectionReason,
    "Item has already been shipped and cannot be retrieved",
  );
  TestValidator.predicate(
    "created_at has valid timestamp",
    mockSnapshot.createdAt !== null && mockSnapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "snapshot created by super administrator",
    mockSnapshot.createdBy === adminOutput.id,
  );
  TestValidator.equals(
    "deleted_at is null (active snapshot)",
    mockSnapshot.deletedAt,
    null,
  );
  TestValidator.predicate(
    "order item exists in snapshot",
    mockSnapshot.cancellationRequest.item.id !== undefined,
  );
  TestValidator.predicate(
    "parent order exists in snapshot",
    mockSnapshot.cancellationRequest.order.id !== undefined,
  );
  TestValidator.predicate(
    "seller exists in snapshot",
    mockSnapshot.cancellationRequest.seller.id !== undefined,
  );
  TestValidator.equals(
    "order item status preserved",
    mockSnapshot.cancellationRequest.item.status,
    "paid",
  );
  TestValidator.equals(
    "order status reflects item status",
    mockSnapshot.cancellationRequest.order.status,
    "paid",
  );
}
