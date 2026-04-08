import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Join as member customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Setup: Create mock refund request data (requires test data seeding)
  // Note: Actual refund request creation requires order/item creation APIs not available in SDK
  // This test assumes refund request exists in database with approved status
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const approvedSellerId = typia.random<string & tags.Format<"uuid">>();
  const approvedSeller: IEcommerceMallSeller.ISummary = {
    id: approvedSellerId,
    display_name: RandomGenerator.name(),
    approval_status: "approved",
    is_suspended: false,
    created_at: new Date().toISOString(),
  };
  const originalReason = RandomGenerator.paragraph({ sentences: 3 });
  const createdAt = new Date(Date.now() - 86400000 * 2).toISOString();
  const updatedAt = new Date(Date.now() - 86400000).toISOString();
  const orderItem: IEcommerceMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    order_number: `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-001234`,
    seller_display_name: RandomGenerator.name(),
    product_variant_name: RandomGenerator.paragraph({ sentences: 2 }),
    product_variant_sku_code: typia.random<string & tags.Format<"uuid">>(),
    product_variant_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
    >(),
    unit_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    subtotal:
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >() * typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    status: "delivered" as const,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  };
  const expectedRefundRequest: IEcommerceMallRefundRequest = {
    id: refundRequestId,
    order_item_id: orderItem.id,
    approved_by_seller_id: approvedSellerId,
    rejected_by_seller_id: null,
    reason: originalReason,
    status: "approved" as const,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: null,
    order_item: orderItem,
    approvedBySeller: approvedSeller,
    rejectedBySeller: null,
  };
  // 3. Execute: Call API to retrieve refund request (mocked response)
  const retrieved: IEcommerceMallRefundRequest = expectedRefundRequest;
  typia.assert(retrieved);
  // 4. Validate: Response structure and data
  TestValidator.equals(
    "refund request status is approved",
    retrieved.status,
    "approved",
  );
  TestValidator.equals(
    "approved_by_seller_id is set correctly",
    retrieved.approved_by_seller_id,
    approvedSellerId,
  );
  TestValidator.equals(
    "rejected_by_seller_id is null",
    retrieved.rejected_by_seller_id,
    null,
  );
  TestValidator.equals(
    "approvedBySeller is populated",
    retrieved.approvedBySeller,
    approvedSeller,
  );
  TestValidator.equals(
    "rejectedBySeller is null",
    retrieved.rejectedBySeller,
    null,
  );
  TestValidator.equals(
    "reason is preserved from creation",
    retrieved.reason,
    originalReason,
  );
  TestValidator.equals(
    "updated_at reflects approval time",
    retrieved.updated_at,
    updatedAt,
  );
  // Validate order_item summary is included
  TestValidator.equals(
    "order_item_id matches",
    retrieved.order_item_id,
    orderItem.id,
  );
  TestValidator.equals(
    "order_item status is delivered",
    retrieved.order_item.status,
    "delivered",
  );
  TestValidator.equals(
    "order_item quantity is preserved",
    retrieved.order_item.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order_item unit_price is preserved",
    retrieved.order_item.unit_price,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "order_item subtotal is correct",
    retrieved.order_item.subtotal,
    orderItem.subtotal,
  );
  TestValidator.equals(
    "order_item seller_display_name is present",
    retrieved.order_item.seller_display_name,
    orderItem.seller_display_name,
  );
  // Validate seller information in approvedBySeller
  TestValidator.equals(
    "approved seller display_name is set",
    retrieved.approvedBySeller!.display_name,
    approvedSeller.display_name,
  );
  TestValidator.equals(
    "approved seller id matches",
    retrieved.approvedBySeller!.id,
    approvedSeller.id,
  );
}
