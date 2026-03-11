import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test customer access control when attempting to view shipments from orders they do not own.
 * This validates the authorization boundary for shipment viewing.
 */
export async function test_api_customer_shipment_tracking_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A registers (order owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    }),
  });
  typia.assert(customerA);
  // 2. Customer B registers (unauthorized access attempt)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: typia.assert<IEcommerceMallCustomer.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    }),
  });
  typia.assert(customerB);
  // 3. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.assert<IEcommerceMallSeller.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    }),
  });
  typia.assert(seller);
  // 4. Customer B attempts to access shipment from order they don't own
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Customer B should not access shipment from order they don't own",
    [404],
    async () => {
      await api.functional.ecommerceMall.customer.orders.shipments.at(
        customerBConnection,
        {
          orderId,
          shipmentId,
        },
      );
    },
  );
}
