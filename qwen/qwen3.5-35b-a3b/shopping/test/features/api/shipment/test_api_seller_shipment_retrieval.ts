import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup using utility function for authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate valid shipmentId for retrieval
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve shipment using seller's authenticated connection
  // Note: sellerConnection.headers will be updated internally by the API call
  const shipment = await api.functional.ecommerceMall.seller.shipments.at(
    sellerConnection,
    {
      shipmentId,
    },
  );
  typia.assert(shipment);
  // 4. Validate shipment structure - all fields present and correctly typed
  TestValidator.equals(
    "carrier name is string",
    typeof shipment.carrierName,
    "string",
  );
  TestValidator.equals(
    "tracking number is string",
    typeof shipment.trackingNumber,
    "string",
  );
  // 5. Validate order summary fields (joined data)
  TestValidator.predicate(
    "order id exists",
    shipment.order.id !== undefined,
  );
  TestValidator.equals(
    "order_number is string",
    typeof shipment.order.order_number,
    "string",
  );
  TestValidator.equals(
    "total_price is number",
    typeof shipment.order.total_price,
    "number",
  );
  TestValidator.equals(
    "overall_status is string",
    typeof shipment.order.overall_status,
    "string",
  );
  // 6. Validate seller summary fields (joined data)
  TestValidator.predicate(
    "seller id exists",
    shipment.seller.id !== undefined,
  );
  TestValidator.equals(
    "email is string",
    typeof shipment.seller.email,
    "string",
  );
  TestValidator.predicate(
    "approval_status is valid",
    ["pending", "approved", "rejected"].includes(
      shipment.seller.approval_status,
    ),
  );
  // 7. Validate timestamps are valid ISO 8601 datetime
  TestValidator.predicate(
    "createdAt is valid date-time",
    !Number.isNaN(Date.parse(shipment.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !Number.isNaN(Date.parse(shipment.updatedAt)),
  );
  // 8. Validate soft deletion timestamp
  TestValidator.equals(
    "deletedAt is null",
    shipment.deletedAt,
    null,
  );
  TestValidator.predicate(
    "deletedAt is valid datetime",
    shipment.deletedAt !== null && !Number.isNaN(Date.parse(shipment.deletedAt)),
  );
}