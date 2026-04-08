import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_customer_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customer);
  // 2. Setup: Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 3. Setup: Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Setup: Customer creates order
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Extract order item ID for refund request
  const orderItemId: string = order.items[0].id;
  // 5. Setup: Customer submits refund request
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Setup: Seller rejects refund request
  // Note: IUpdate DTO only has status field, rejection_reason is server-side
  const updatedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequest.id,
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(updatedRefundRequest);
  // 7. Test: Customer retrieves refund request snapshot
  const snapshot =
    await api.functional.ecommerceMall.member.refund_request_snapshots.at(
      customerConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot fields
  TestValidator.equals("snapshot id matches", snapshot.id, refundRequest.id);
  TestValidator.equals("status is rejected", snapshot.status, "rejected");
  TestValidator.equals(
    "approved_by_seller_id is null",
    snapshot.approved_by_seller_id,
    null,
  );
  TestValidator.notEquals(
    "rejected_by_seller_id is populated",
    snapshot.rejected_by_seller,
    null,
  );
  TestValidator.notEquals(
    "rejection_reason is populated",
    snapshot.rejection_reason,
    null,
  );
  TestValidator.equals(
    "reason matches customer's original reason",
    snapshot.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "created_at exists",
    snapshot.created_at !== undefined && snapshot.created_at !== null,
  );
  TestValidator.predicate(
    "responded_at exists",
    snapshot.responded_at !== undefined && snapshot.responded_at !== null,
  );
  TestValidator.equals(
    "snapshot_at equals responded_at",
    snapshot.snapshot_at,
    snapshot.responded_at,
  );
  TestValidator.notEquals("order_item is populated", snapshot.order_item, null);
  TestValidator.notEquals(
    "rejected_by_seller is populated",
    snapshot.rejected_by_seller,
    null,
  );
  // Validate order_item denormalized fields
  TestValidator.predicate(
    "order_item has order_number",
    snapshot.order_item?.order_number !== undefined &&
      snapshot.order_item?.order_number !== null &&
      snapshot.order_item.order_number.length > 0,
  );
  TestValidator.predicate(
    "order_item has seller_display_name",
    snapshot.order_item?.seller_display_name !== undefined &&
      snapshot.order_item?.seller_display_name !== null &&
      snapshot.order_item.seller_display_name.length > 0,
  );
  TestValidator.predicate(
    "order_item has product_variant_name",
    snapshot.order_item?.product_variant_name !== undefined &&
      snapshot.order_item?.product_variant_name !== null &&
      snapshot.order_item.product_variant_name.length > 0,
  );
  TestValidator.predicate(
    "order_item has product_variant_sku_code",
    snapshot.order_item?.product_variant_sku_code !== undefined &&
      snapshot.order_item?.product_variant_sku_code !== null &&
      snapshot.order_item.product_variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "order_item has product_variant_price",
    snapshot.order_item?.product_variant_price !== undefined &&
      snapshot.order_item?.product_variant_price !== null &&
      snapshot.order_item.product_variant_price > 0,
  );
  TestValidator.predicate(
    "order_item has quantity",
    snapshot.order_item?.quantity !== undefined &&
      snapshot.order_item?.quantity !== null &&
      snapshot.order_item.quantity >= 1,
  );
  TestValidator.predicate(
    "order_item has unit_price",
    snapshot.order_item?.unit_price !== undefined &&
      snapshot.order_item?.unit_price !== null &&
      snapshot.order_item.unit_price > 0,
  );
  TestValidator.predicate(
    "order_item has subtotal",
    snapshot.order_item?.subtotal !== undefined &&
      snapshot.order_item?.subtotal !== null &&
      snapshot.order_item.subtotal > 0,
  );
  TestValidator.predicate(
    "order_item has status",
    snapshot.order_item?.status !== undefined &&
      snapshot.order_item?.status !== null &&
      snapshot.order_item.status.length > 0,
  );
  // Validate rejected_by_seller
  TestValidator.equals(
    "rejected_by_seller id matches seller",
    snapshot.rejected_by_seller?.id,
    seller.id,
  );
  TestValidator.equals(
    "rejected_by_seller display_name matches seller",
    snapshot.rejected_by_seller?.display_name,
    seller.display_name,
  );
}