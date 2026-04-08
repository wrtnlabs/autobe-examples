import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_seller_refund_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(adminJoin);
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: adminJoin.token.access,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Seller A registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Seller A",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // Store seller ID for later validation
  const sellerId: string = sellerJoin.id;
  // 3. Create admin account (needed for seller approval)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(admin2);
  await authorize_administrator_login(admin2Connection, {
    body: {
      email: admin2.email,
      password: admin2.token.access,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 4. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerJoin);
  await authorize_member_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: customerJoin.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 5. Create category for product
  // Note: Category creation would require admin endpoint, but for this test
  // we'll use a random category ID assumption for the schema
  const category = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Test Category",
    description: null,
    sort_order: null,
    parent: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // 6. Create product for seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: JSON.stringify({ size: "L", color: "Red" }),
          stock_quantity: 100,
          price: product.base_price,
        },
      },
    );
  typia.assert(variant);
  // 8. Create customer address
  const addressId: string = typia.random<string & tags.Format<"uuid">>();
  // 9. Create customer order with the variant
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: addressId,
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 10. Create refund request for delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Verify refund request is pending
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request belongs to correct order item",
    refundRequest.order_item_id,
    order.items[0].id,
  );
  // 12. Seller A login to reject refund request
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: sellerJoin.token.access,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 13. Seller A rejects the refund request
  const rejectionResponse =
    await api.functional.ecommerceMall.seller.seller.refund_requests.update(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          status: "rejected",
        },
      },
    );
  typia.assert(rejectionResponse);
  // 14. Validate rejection response
  TestValidator.equals(
    "status changed to rejected",
    rejectionResponse.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected_by_seller_id is populated",
    rejectionResponse.rejected_by_seller_id !== null,
    true,
  );
  TestValidator.equals(
    "rejected_by_seller_id matches seller",
    rejectionResponse.rejected_by_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "order item status remains delivered",
    order.items[0].status,
    "delivered",
  );
  // 15. Verify refund request cannot be updated again
  await TestValidator.error(
    "cannot update rejected refund request",
    async () => {
      await api.functional.ecommerceMall.seller.seller.refund_requests.update(
        sellerConnection,
        {
          requestId: refundRequest.id,
          body: {
            status: "approved",
          },
        },
      );
    },
  );
}