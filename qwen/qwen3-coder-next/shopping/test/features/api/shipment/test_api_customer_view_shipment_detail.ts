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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_view_shipment_detail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email"> & tags.MinLength<1>>() satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  typia.assert(customerAuthorized);
  // 2. Create order
  const order =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
    );
  typia.assert(order);
  // 3. Get shipment ID from order
  const shipmentId = (order as IEcommerceMallOrder & { shipment_id?: string }).shipment_id || "00000000-0000-0000-0000-000000000000";
  // 4. Retrieve shipment details
  const shipment = await api.functional.ecommerceMall.customer.shipments.at(
    customerConnection,
    {
      shipmentId: shipmentId,
    },
  );
  typia.assert(shipment);
  // 5. Validate response structure
  TestValidator.equals(
    "shipment has ID",
    typeof shipment.id === "string",
    true,
  );
  TestValidator.predicate("has timestamps", shipment.created_at !== null);
  TestValidator.equals("has seller summary", shipment.seller !== null, true);
  TestValidator.equals("has order summary", shipment.order !== null, true);
  TestValidator.predicate(
    "has seller shop_name",
    typeof shipment.seller.shop_name === "string",
  );
  TestValidator.predicate(
    "has seller approval_status",
    typeof shipment.seller.approval_status === "string",
  );
  TestValidator.predicate(
    "has seller is_suspended",
    typeof shipment.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "has order customer",
    shipment.order.customer !== null,
  );
  TestValidator.predicate(
    "has order shipping_address",
    shipment.order.shipping_address !== null,
  );
}