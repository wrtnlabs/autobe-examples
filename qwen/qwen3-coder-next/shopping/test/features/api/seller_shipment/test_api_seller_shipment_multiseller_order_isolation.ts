import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipment_multiseller_order_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for seller1
  const seller1Email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1ShopName = RandomGenerator.name(2);
  // Create seller1 account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Authorized = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      shop_name: seller1ShopName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1Authorized);
  // Generate credentials for seller2
  const seller2Email = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2ShopName = RandomGenerator.name(2);
  // Create seller2 account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Authorized = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      shop_name: seller2ShopName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2Authorized);
  // Generate credentials for customer
  const customerEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1>
  >();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerName = RandomGenerator.name(2);
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      name: customerName,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // Login as seller1
  const seller1LoginConnection: api.IConnection = { host: connection.host };
  const seller1Login = await authorize_seller_login(seller1LoginConnection, {
    body: {
      email: seller1Email,
      password: seller1Password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(seller1Login);
  // Login as seller2
  const seller2LoginConnection: api.IConnection = { host: connection.host };
  const seller2Login = await authorize_seller_login(seller2LoginConnection, {
    body: {
      email: seller2Email,
      password: seller2Password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(seller2Login);
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogin);
  // Create a simple order
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerLoginConnection,
  );
  typia.assert(order);
  // Create shipments for each seller
  // Seller1 creates shipment for their items
  const shipment1 =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      seller1LoginConnection,
      {
        orderId: order.id,
        body: {
          order_items: [
            typia.random<string & tags.Format<"uuid"> & tags.MinLength<1>>(),
          ],
          carrier_name: "Kuroneko Yamato",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  // Seller2 creates shipment for their items
  const shipment2 =
    await api.functional.ecommerceMall.seller.orders.shipments.create(
      seller2LoginConnection,
      {
        orderId: order.id,
        body: {
          order_items: [
            typia.random<string & tags.Format<"uuid"> & tags.MinLength<1>>(),
          ],
          carrier_name: "Yuunyu",
          tracking_number: RandomGenerator.alphaNumeric(12),
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment2);
  // Seller1 retrieves shipments and validates only their own is returned
  const shipments1 =
    await api.functional.ecommerceMall.seller.orders.shipments.index(
      seller1LoginConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(shipments1);
  TestValidator.equals(
    "seller1 sees only their shipment",
    shipments1.data.length,
    1,
  );
  TestValidator.equals(
    "seller1 sees correct seller",
    shipments1.data[0].seller.id,
    seller1Login.id,
  );
  // Seller2 retrieves shipments and validates only their own is returned
  const shipments2 =
    await api.functional.ecommerceMall.seller.orders.shipments.index(
      seller2LoginConnection,
      {
        orderId: order.id,
      },
    );
  typia.assert(shipments2);
  TestValidator.equals(
    "seller2 sees only their shipment",
    shipments2.data.length,
    1,
  );
  TestValidator.equals(
    "seller2 sees correct seller",
    shipments2.data[0].seller.id,
    seller2Login.id,
  );
}
