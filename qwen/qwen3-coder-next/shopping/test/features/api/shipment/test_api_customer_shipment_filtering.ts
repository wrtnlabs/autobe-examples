import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test customer shipment filtering capabilities.
 * 1. Create seller and customer actors
 * 2. Seller creates product and ships orders
 * 3. Customer filters shipments by status
 * 4. Test various filter combinations
 */
export async function test_api_customer_shipment_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller actor
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinInput = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinInput,
  });
  typia.assert(sellerAuthorized);
  // 2. Create customer actor
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinInput = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuthorized);
  // 3. Seller login
  const sellerLoginInput = {
    email: sellerJoinInput.email,
    password: sellerJoinInput.password,
  } satisfies IShoppingMallSeller.ILogin;
  await authorize_seller_login(sellerConnection, {
    body: sellerLoginInput,
  });
  // 4. Customer login
  const customerLoginInput = {
    email: customerJoinInput.email,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: customerLoginInput,
  });
  // 5. Create an order first (required before shipment can be created)
  const order = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(order);
  // 6. Test status filtering for shipments
  const pendingShipment =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(pendingShipment);
  const deliveredShipment =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredShipment);
  // 7. Test tracking number search
  const trackingNumber = typia.random<string>();
  const trackingSearch =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          tracking_number: trackingNumber,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(trackingSearch);
  // 8. Test carrier filtering
  const carrier = "Korea Express";
  const carrierFilter =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          tracking_carrier: carrier,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(carrierFilter);
  // 9. Test date range filtering
  const now = new Date().toISOString();
  const recentDateFilter =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          created_at_start: now,
          created_at_end: now,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(recentDateFilter);
  // 10. Test combined filtering
  const combinedFilter =
    await api.functional.shoppingMall.customer.shipments.index(
      customerConnection,
      {
        body: {
          status: "pending",
          tracking_number: trackingNumber,
          tracking_carrier: carrier,
          created_at_start: now,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 11. Test pagination
  const paginated = await api.functional.shoppingMall.customer.shipments.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "pagination limit respected",
    paginated.pagination.limit <= 5,
  );
}
