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
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipment_items_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer registers and logs in
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Data = {
    email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customer1Authorized = await authorize_customer_join(
    customer1Connection,
    {
      body: customer1Data,
    },
  );
  // 2. First customer creates an order to generate a shipment
  const customer1Order =
    await api.functional.ecommerceMall.customer.orders.create(
      customer1Connection,
    );
  typia.assert(customer1Order);
  // 3. Second customer registers and logs in
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Data = {
    email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IEcommerceMallCustomer.IJoin;
  const customer2Authorized = await authorize_customer_join(
    customer2Connection,
    {
      body: customer2Data,
    },
  );
  // 4. Second customer attempts to access first customer's shipment (should fail with 404)
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 when accessing other customer's shipment",
    async () => {
      await api.functional.ecommerceMall.customer.shipments.items.search(
        customer2Connection,
        {
          shipmentId,
        },
      );
    },
  );
}