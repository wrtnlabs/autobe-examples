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
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_customer_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.paragraph({ sentences: 1 }),
          state: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: typia
            .random<string & tags.Format<"email">>()
            .slice(0, 6),
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // 5. Customer creates order with product variant
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Customer submits refund request for delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 7. Seller approves the refund request (creates snapshot)
  const updatedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequest.id,
        body: {
          status: "approved",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 8. Customer retrieves the refund request snapshot
  // The snapshot ID may be the same as refund request ID or a new UUID
  // We use refundRequest.id as the snapshot ID since snapshots reference refund requests
  const snapshot =
    await api.functional.ecommerceMall.member.refund_request_snapshots.at(
      customerConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot status and seller approval
  TestValidator.equals(
    "snapshot ID matches refund request",
    snapshot.id,
    refundRequest.id,
  );
  TestValidator.equals("status is approved", snapshot.status, "approved");
  TestValidator.equals(
    "approved_by_seller_id is populated",
    snapshot.approved_by_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "rejected_by_seller is null",
    snapshot.rejected_by_seller,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    snapshot.rejection_reason,
    null,
  );
  TestValidator.equals("reason matches", snapshot.reason, refundRequest.reason);
  TestValidator.equals(
    "created_at matches",
    snapshot.created_at,
    refundRequest.created_at,
  );
  TestValidator.predicate(
    "responded_at is set",
    snapshot.responded_at !== undefined && snapshot.responded_at !== null,
  );
  TestValidator.equals(
    "snapshot_at equals responded_at",
    snapshot.snapshot_at,
    snapshot.responded_at!,
  );
  // 10. Validate order_item details are enriched
  TestValidator.predicate(
    "order_item is populated",
    snapshot.order_item !== undefined && snapshot.order_item !== null,
  );
  if (snapshot.order_item) {
    TestValidator.equals(
      "order_number matches",
      snapshot.order_item.order_number,
      order.order_number,
    );
    TestValidator.equals(
      "seller_display_name matches",
      snapshot.order_item.seller_display_name,
      seller.display_name,
    );
    TestValidator.equals(
      "product_variant_name matches",
      snapshot.order_item.product_variant_name,
      product.name,
    );
    TestValidator.equals(
      "product_variant_sku_code matches",
      snapshot.order_item.product_variant_sku_code,
      product.variants[0].sku_code,
    );
    TestValidator.equals(
      "quantity matches",
      snapshot.order_item.quantity,
      order.items[0].quantity,
    );
    TestValidator.equals(
      "unit_price matches",
      snapshot.order_item.unit_price,
      order.items[0].unit_price,
    );
    TestValidator.equals(
      "subtotal matches",
      snapshot.order_item.subtotal,
      order.items[0].subtotal,
    );
  }
  // 11. Validate approved_by_seller details are populated
  TestValidator.predicate(
    "approved_by_seller is populated",
    snapshot.approved_by_seller !== undefined &&
      snapshot.approved_by_seller !== null,
  );
  if (snapshot.approved_by_seller) {
    TestValidator.equals(
      "approved_by_seller.id matches",
      snapshot.approved_by_seller.id,
      seller.id,
    );
    TestValidator.equals(
      "approved_by_seller.display_name matches",
      snapshot.approved_by_seller.display_name,
      seller.display_name,
    );
    TestValidator.equals(
      "approved_by_seller.email matches",
      snapshot.approved_by_seller.email,
      seller.email,
    );
  }
  // 12. Validate rejected_by_seller is not populated for approved status
  TestValidator.equals(
    "rejected_by_seller is null for approved status",
    snapshot.rejected_by_seller,
    null,
  );
}