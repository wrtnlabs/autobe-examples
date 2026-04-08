import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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

/**
 * Test super administrator viewing refund requests with full platform oversight.
 *
 * Validates that super administrators can retrieve any refund request across the entire platform,
 * regardless of which seller or customer owns the associated order. This test registers a super
 * administrator and verifies they can access refund request details including order item
 * information, approval status, and timestamps.
 *
 * Since the available API functions only include the super administrator refund request view
 * endpoint, this test uses typia.random to generate a refund request entity and verifies the
 * super admin has universal read access to it. This demonstrates the platform's oversight
 * capabilities for dispute resolution and fraud detection.
 */
export async function test_api_super_administrator_refund_request_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(superAdmin);
  // 2. Generate a refund request entity (simulating existing refund request in database)
  const refundRequest: IEcommerceMallRefundRequest =
    typia.random<IEcommerceMallRefundRequest>();
  typia.assert(refundRequest);
  // 3. Super admin views refund request
  const viewedRefundRequest: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.superAdministrator.refund_requests.at(
      superAdminConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(viewedRefundRequest);
  // 4. Validate response
  TestValidator.equals(
    "refund request ID matches",
    viewedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order item ID matches",
    viewedRefundRequest.order_item_id,
    refundRequest.order_item_id,
  );
  TestValidator.equals(
    "reason preserved",
    viewedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "status preserved",
    viewedRefundRequest.status,
    refundRequest.status,
  );
  TestValidator.equals(
    "approved_by_seller_id matches",
    viewedRefundRequest.approved_by_seller_id,
    refundRequest.approved_by_seller_id,
  );
  TestValidator.equals(
    "rejected_by_seller_id matches",
    viewedRefundRequest.rejected_by_seller_id,
    refundRequest.rejected_by_seller_id,
  );
  TestValidator.equals(
    "deleted_at matches",
    viewedRefundRequest.deleted_at,
    refundRequest.deleted_at,
  );
  TestValidator.notEquals(
    "created_at is set",
    viewedRefundRequest.created_at,
    "",
  );
  TestValidator.notEquals(
    "updated_at is set",
    viewedRefundRequest.updated_at,
    "",
  );
  TestValidator.equals(
    "order_item ID matches",
    viewedRefundRequest.order_item.id,
    refundRequest.order_item.id,
  );
  TestValidator.equals(
    "order_number matches",
    viewedRefundRequest.order_item.order_number,
    refundRequest.order_item.order_number,
  );
  TestValidator.equals(
    "seller display name matches",
    viewedRefundRequest.order_item.seller_display_name,
    refundRequest.order_item.seller_display_name,
  );
  TestValidator.equals(
    "product variant name matches",
    viewedRefundRequest.order_item.product_variant_name,
    refundRequest.order_item.product_variant_name,
  );
  TestValidator.equals(
    "SKU code matches",
    viewedRefundRequest.order_item.product_variant_sku_code,
    refundRequest.order_item.product_variant_sku_code,
  );
  TestValidator.equals(
    "quantity matches",
    viewedRefundRequest.order_item.quantity,
    refundRequest.order_item.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    viewedRefundRequest.order_item.unit_price,
    refundRequest.order_item.unit_price,
  );
  TestValidator.equals(
    "subtotal matches",
    viewedRefundRequest.order_item.subtotal,
    refundRequest.order_item.subtotal,
  );
  TestValidator.equals(
    "item status matches",
    viewedRefundRequest.order_item.status,
    refundRequest.order_item.status,
  );
  TestValidator.equals(
    "approvedBySeller is null or matches",
    viewedRefundRequest.approvedBySeller,
    refundRequest.approvedBySeller,
  );
  TestValidator.equals(
    "rejectedBySeller is null or matches",
    viewedRefundRequest.rejectedBySeller,
    refundRequest.rejectedBySeller,
  );
}
