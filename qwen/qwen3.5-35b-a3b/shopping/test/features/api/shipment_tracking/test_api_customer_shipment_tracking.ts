import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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

export async function test_api_customer_shipment_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string,
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>() as string,
      referrer: typia.random<string & tags.Format<"uri">>() as string,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create mock shipment data using random data
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve shipment details
  const shipment =
    await api.functional.ecommerceMall.customer.orders.shipments.at(
      customerConnection,
      {
        orderId,
        shipmentId,
      },
    );
  typia.assert(shipment);
  // 4. Validate response structure
  // Validate carrier name exists and is string
  TestValidator.equals(
    "carrier name is string",
    typeof shipment.carrier_name,
    "string",
  );
  TestValidator.predicate(
    "carrier name is not empty",
    shipment.carrier_name.length > 0,
  );
  // Validate tracking number exists and is string
  TestValidator.equals(
    "tracking number is string",
    typeof shipment.tracking_number,
    "string",
  );
  TestValidator.predicate(
    "tracking number is not empty",
    shipment.tracking_number.length > 0,
  );
  // Validate timestamps are ISO 8601 format
  const createdAt = new Date(shipment.created_at);
  const updatedAt = new Date(shipment.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );
  // Validate deleted_at is null for active shipment
  TestValidator.equals(
    "deleted_at is null for active shipment",
    shipment.deleted_at,
    null,
  );
  // Validate order relationship
  TestValidator.equals("order id is UUID", typeof shipment.order.id, "string");
  TestValidator.equals(
    "order has order_number",
    typeof shipment.order.order_number,
    "string",
  );
  TestValidator.equals(
    "order has total_price",
    typeof shipment.order.total_price,
    "number",
  );
  TestValidator.predicate(
    "order has valid overall_status",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partiallyCompleted",
    ].includes(shipment.order.overall_status),
  );
  TestValidator.equals(
    "order has created_at",
    typeof shipment.order.created_at,
    "string",
  );
  TestValidator.equals(
    "order customer id is UUID",
    typeof shipment.order.customer.id,
    "string",
  );
  TestValidator.equals(
    "order customer has email",
    typeof shipment.order.customer.email,
    "string",
  );
  TestValidator.equals(
    "order customer has display_name",
    typeof shipment.order.customer.display_name,
    "string",
  );
  TestValidator.equals(
    "order customer has is_banned",
    typeof shipment.order.customer.is_banned,
    "boolean",
  );
  TestValidator.equals(
    "order customer has created_at",
    typeof shipment.order.customer.created_at,
    "string",
  );
  // Validate seller relationship
  TestValidator.equals(
    "seller id is UUID",
    typeof shipment.seller.id,
    "string",
  );
  TestValidator.equals(
    "seller has email",
    typeof shipment.seller.email,
    "string",
  );
  TestValidator.predicate(
    "seller has valid approval_status",
    ["pending", "approved", "rejected"].includes(
      shipment.seller.approvalStatus,
    ),
  );
  TestValidator.predicate(
    "seller rejectionReason is string or null",
    typeof shipment.seller.rejectionReason === "string" ||
      shipment.seller.rejectionReason === null,
  );
  TestValidator.equals(
    "seller has isSuspended",
    typeof shipment.seller.isSuspended,
    "boolean",
  );
  TestValidator.equals(
    "seller has isBanned",
    typeof shipment.seller.isBanned,
    "boolean",
  );
  TestValidator.equals(
    "seller has createdAt",
    typeof shipment.seller.createdAt,
    "string",
  );
  TestValidator.equals(
    "seller has updatedAt",
    typeof shipment.seller.updatedAt,
    "string",
  );
}