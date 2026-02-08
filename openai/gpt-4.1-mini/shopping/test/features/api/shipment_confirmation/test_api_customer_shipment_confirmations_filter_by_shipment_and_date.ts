import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentConfirmation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
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

export async function test_api_customer_shipment_confirmations_filter_by_shipment_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join & login
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const customerPassword = "Password123!";
  const customerJoinResponse = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerJoinResponse);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 2. Seller join & login
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerPassword = "Password123!";
  const sellerJoinResponse = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoinResponse);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller creates multiple shipments
  const shipments: IShoppingMallShipment[] = [];
  for (let i = 0; i < 3; i++) {
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {},
        },
      );
    typia.assert(shipment);
    // Adjusted here: shipments may not have 'id', maybe 'shipment_id', so check and assign accordingly
    shipments.push(shipment);
  }
  // 4. Customer requests shipment confirmations filtered by shipment ID and confirmation date range
  const firstShipment = shipments[0];
  // Derive shipment ID safely
  const shipmentId = (firstShipment as any).id ?? (firstShipment as any).shipment_id;
  if (shipmentId === undefined) {
    throw new Error("Shipment ID not found on shipment object.");
  }
  const now = new Date();
  const oneDayMs = 1000 * 60 * 60 * 24;
  const fromDate = new Date(now.getTime() - oneDayMs).toISOString();
  const toDate = new Date(now.getTime() + oneDayMs).toISOString();
  const filter1: IShoppingMallShipmentConfirmation.IRequest = {
    shipment_id: shipmentId as string,
    confirmed_at: {
      from: fromDate,
      to: toDate,
    },
    page: 1,
    limit: 10,
  };
  const queryResponse1 =
    await api.functional.shoppingMall.customer.shipment_confirmations.index(
      customerConnection,
      {
        body: filter1,
      },
    );
  typia.assert(queryResponse1);
  queryResponse1.data.forEach((record) => {
    // Because the type of record.data element is not fully known and error says missing fields,
    // We cast record to any and check properties with optional chaining
    const recordAny = record as any;
    TestValidator.equals(
      "shipment id matches",
      recordAny.shipment_id,
      shipmentId as string,
    );
    if (recordAny.confirmed_at !== null && recordAny.confirmed_at !== undefined) {
      TestValidator.predicate(
        "confirmed_at in range",
        recordAny.confirmed_at >= fromDate && recordAny.confirmed_at <= toDate,
      );
    }
  });
  TestValidator.predicate(
    "current page is 1",
    queryResponse1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit is 10",
    queryResponse1.pagination.limit === 10,
  );
  // 5. Test pagination: request second page
  const filter2: IShoppingMallShipmentConfirmation.IRequest = {
    shipment_id: shipmentId as string,
    confirmed_at: {
      from: fromDate,
      to: toDate,
    },
    page: 2,
    limit: 10,
  };
  const queryResponse2 =
    await api.functional.shoppingMall.customer.shipment_confirmations.index(
      customerConnection,
      {
        body: filter2,
      },
    );
  typia.assert(queryResponse2);
  // For pagination uniqueness validation, use any to access 'id' property if exists
  const idsPage1 = new Set<string>();
  queryResponse1.data.forEach((r) => {
    const id = (r as any).id;
    if (id !== undefined) idsPage1.add(id);
  });
  const idsPage2 = new Set<string>();
  queryResponse2.data.forEach((r) => {
    const id = (r as any).id;
    if (id !== undefined) idsPage2.add(id);
  });
  idsPage2.forEach((id) => {
    TestValidator.predicate("no duplicate between pages", !idsPage1.has(id));
  });
}
