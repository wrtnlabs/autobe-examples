import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_shipment_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create new connection with admin token for API calls
  const adminApiConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminAuthorized.token.access,
    },
  };
  // 3. Generate random shipment ID for retrieval test
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve shipment by ID
  const shipment = await api.functional.ecommerceMall.admin.shipments.at(
    adminApiConnection,
    { shipmentId },
  );
  typia.assert(shipment);
  // 5. Validate shipment structure
  TestValidator.predicate(
    "shipment has carrier name",
    shipment.carrierName.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    shipment.trackingNumber.length > 0,
  );
  TestValidator.predicate(
    "shipment has valid createdAt",
    shipment.createdAt !== undefined,
  );
  TestValidator.predicate(
    "shipment has valid updatedAt",
    shipment.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "shipment deletedAt can be null",
    shipment.deletedAt === null || shipment.deletedAt !== undefined,
  );
  // 6. Validate order join
  typia.assert(shipment.order);
  TestValidator.predicate("order has UUID id", shipment.order.id.length > 0);
  TestValidator.predicate(
    "order has order number",
    shipment.order.order_number.length > 0,
  );
  TestValidator.predicate(
    "order has total price",
    typeof shipment.order.total_price === "number",
  );
  TestValidator.predicate(
    "order has overall status",
    shipment.order.overall_status.length > 0,
  );
  TestValidator.predicate(
    "order has created_at",
    shipment.order.created_at !== undefined,
  );
  // 7. Validate seller join
  typia.assert(shipment.seller);
  TestValidator.predicate("seller has UUID id", shipment.seller.id.length > 0);
  TestValidator.predicate("seller has email", shipment.seller.email.length > 0);
  TestValidator.predicate(
    "seller has approval status",
    ["pending", "approved", "rejected"].includes(
      shipment.seller.approval_status,
    ),
  );
  TestValidator.predicate(
    "seller has created_at",
    shipment.seller.created_at !== undefined,
  );
}
