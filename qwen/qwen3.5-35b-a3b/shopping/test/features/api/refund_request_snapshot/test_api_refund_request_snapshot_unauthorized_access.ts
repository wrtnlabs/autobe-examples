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

export async function test_api_refund_request_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Customer A (unauthorized access attempter)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAPassword = RandomGenerator.alphaNumeric(16);
  const customerA = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerAPassword,
    },
  });
  typia.assert(customerA);
  await authorize_member_login(customerAConnection, {
    body: {
      email: customerA.email,
      password: customerAPassword,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // 2. Setup Customer B (snapshot owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBPassword = RandomGenerator.alphaNumeric(16);
  const customerB = await authorize_member_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerBPassword,
    },
  });
  typia.assert(customerB);
  await authorize_member_login(customerBConnection, {
    body: {
      email: customerB.email,
      password: customerBPassword,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // 3. Setup Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    },
  });
  // 4. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer B creates order
  const order = await generate_random_ecommerce_mall_member_orders_create(
    customerBConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 6. Customer B submits refund request
  const refundRequest =
    await generate_random_ecommerce_mall_member_refund_requests_create(
      customerBConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          reason: "Item defective",
        },
      },
    );
  typia.assert(refundRequest);
  // 7. Seller approves refund request (creates snapshot)
  const approvedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedRefund);
  // 8. Customer A attempts unauthorized access to snapshot
  await TestValidator.error(
    "Customer A cannot access Customer B's refund request snapshot",
    async () => {
      await api.functional.ecommerceMall.member.refund_request_snapshots.at(
        customerAConnection,
        {
          id: refundRequest.id,
        },
      );
    },
  );
}