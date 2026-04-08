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

export async function test_api_seller_refund_request_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create a valid category ID for product creation
  // Since admin categories API doesn't exist, we use a generated UUID
  const category = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Test Category",
    description: null,
    sort_order: 0,
    parent: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IEcommerceMallCategory.ISummary;
  // 4. Seller creates product (which includes variants)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Extract the first variant from the created product
  TestValidator.predicate(
    "product has at least one variant",
    product.variants.length > 0,
  );
  const variant = product.variants[0];
  typia.assert(variant);
  // 6. Generate order with shipping address using the order generator
  // This function handles address creation internally via prepare_random_ecommerce_mall_order
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: undefined,
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 7. Manually modify order item status to 'delivered' for refund test
  // Note: In real system, status changes via shipment workflow
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 8. Customer submits refund request for delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: "Product arrived damaged",
        },
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in pending status
  TestValidator.equals(
    "refund request pending",
    refundRequest.status,
    "pending",
  );
  // 9. Seller approves refund request
  const updatedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(updatedRefundRequest);
  // 10. Verify refund request response
  TestValidator.equals(
    "refund request approved",
    updatedRefundRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "approved_by_seller_id set",
    updatedRefundRequest.approved_by_seller_id,
    null,
  );
  TestValidator.equals(
    "approved by correct seller",
    updatedRefundRequest.approved_by_seller_id,
    sellerAuth.id,
  );
  TestValidator.notEquals(
    "approvedBySeller relationship set",
    updatedRefundRequest.approvedBySeller,
    null,
  );
}
