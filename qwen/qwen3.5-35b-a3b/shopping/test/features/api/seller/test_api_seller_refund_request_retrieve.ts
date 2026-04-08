import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller account creation and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Generate mock refund request data for testing
  // Since we only have GET endpoint, we simulate the refund request structure
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderNumber = `ORD-${RandomGenerator.alphaNumeric(8)}`;
  const productVariantName = RandomGenerator.paragraph({ sentences: 2 });
  const productVariantSkuCode = RandomGenerator.alphaNumeric(10);
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const unitPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const subtotal = quantity * unitPrice;
  const reason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const now = new Date();
  const createdAt = now.toISOString();
  const updatedAt = new Date(now.getTime() + 3600000).toISOString(); // +1 hour
  // 3. Retrieve the refund request by ID
  const refundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        id: refundRequestId,
      },
    );
  typia.assert(refundRequest);
  // 4. Validate refund request structure
  TestValidator.equals("refund request ID", refundRequest.id, refundRequestId);
  TestValidator.equals(
    "order item ID",
    refundRequest.order_item_id,
    orderItemId,
  );
  TestValidator.equals(
    "order number",
    refundRequest.order_item.order_number,
    orderNumber,
  );
  TestValidator.equals(
    "seller display name",
    refundRequest.order_item.seller_display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals(
    "product variant name",
    refundRequest.order_item.product_variant_name,
    productVariantName,
  );
  TestValidator.equals(
    "product variant SKU code",
    refundRequest.order_item.product_variant_sku_code,
    productVariantSkuCode,
  );
  TestValidator.equals(
    "product variant price",
    refundRequest.order_item.product_variant_price,
    unitPrice,
  );
  TestValidator.equals("quantity", refundRequest.order_item.quantity, quantity);
  TestValidator.equals(
    "unit price",
    refundRequest.order_item.unit_price,
    unitPrice,
  );
  TestValidator.equals("subtotal", refundRequest.order_item.subtotal, subtotal);
  TestValidator.equals(
    "order item status",
    refundRequest.order_item.status,
    "delivered",
  );
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  TestValidator.notEquals("reason not empty", refundRequest.reason, "");
  TestValidator.equals(
    "approved by seller ID",
    refundRequest.approved_by_seller_id,
    null,
  );
  TestValidator.equals(
    "rejected by seller ID",
    refundRequest.rejected_by_seller_id,
    null,
  );
  TestValidator.equals(
    "approvedBySeller",
    refundRequest.approvedBySeller,
    null,
  );
  TestValidator.equals(
    "rejectedBySeller",
    refundRequest.rejectedBySeller,
    null,
  );
  TestValidator.equals("created_at", refundRequest.created_at, createdAt);
  TestValidator.equals("updated_at", refundRequest.updated_at, updatedAt);
  TestValidator.equals("deleted_at", refundRequest.deleted_at, null);
}