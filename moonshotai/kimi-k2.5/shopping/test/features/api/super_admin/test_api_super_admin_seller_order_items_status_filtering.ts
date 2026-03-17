import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_super_admin_seller_order_items_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Step 2: Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 3: Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 4: Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 5: Customer checkout creates order with paid items
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  const firstOrderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(order.orderItems[0]);
  // Step 6: Seller creates shipment to change first item to shipped status
  await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [firstOrderItem.id],
        carrierName: "FedEx",
        trackingNumber: "TRACK123456",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  // Step 7: Super admin filters by 'paid' status
  const paidItems =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          status: "paid",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItems);
  // Verify only paid items are returned (shipped item should not appear)
  TestValidator.predicate(
    "paid filter excludes shipped items",
    () => !paidItems.data.some((item) => (item as IEcommerceMallOrderItem & IEntity).id === firstOrderItem.id),
  );
  TestValidator.predicate("all returned items have paid status", () =>
    paidItems.data.every((item) => item.status === "paid"),
  );
  // Step 8: Super admin filters by 'shipped' status
  const shippedItems =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          status: "shipped",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  // Verify only shipped items are returned
  TestValidator.equals("shipped items count", shippedItems.data.length, 1);
  TestValidator.equals(
    "shipped item id matches",
    (shippedItems.data[0] as IEcommerceMallOrderItem & IEntity).id,
    firstOrderItem.id,
  );
  TestValidator.predicate("all returned items have shipped status", () =>
    shippedItems.data.every((item) => item.status === "shipped"),
  );
  // Step 9: Super admin filters by 'delivered' status (should be empty)
  const deliveredItems =
    await api.functional.ecommerceMall.superAdmin.sellers.orderItems.index(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          status: "delivered",
        } satisfies IEcommerceMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  TestValidator.equals(
    "delivered items should be empty",
    deliveredItems.data.length,
    0,
  );
}