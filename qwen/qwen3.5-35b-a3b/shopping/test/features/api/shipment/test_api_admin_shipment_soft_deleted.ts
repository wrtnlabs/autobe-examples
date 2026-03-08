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

export async function test_api_admin_shipment_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await api.functional.ecommerceMall.auth.admin.join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminJoin);
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminJoin.token.access}` },
  };
  // 2. Generate a mock soft-deleted shipment with deletedAt timestamp
  // This simulates a shipment that has been soft-deleted for historical reference
  const softDeletedShipmentId = typia.random<string & tags.Format<"uuid">>();
  const deletedAtTimestamp = new Date().toISOString();
  const mockShipment: IEcommerceMallShipment = {
    id: softDeletedShipmentId,
    order: typia.random<IEcommerceMallOrder.ISummary>(),
    seller: typia.random<IEcommerceMallSeller.ISummary>(),
    carrierName: RandomGenerator.alphaNumeric(10),
    trackingNumber: RandomGenerator.alphaNumeric(20),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    deletedAt: deletedAtTimestamp,
  };
  // 3. Admin retrieves the soft-deleted shipment
  // According to business rules, soft-deleted shipments should still be retrievable
  const retrievedShipment =
    await api.functional.ecommerceMall.admin.shipments.at(adminAuthConnection, {
      shipmentId: softDeletedShipmentId,
    });
  typia.assert(retrievedShipment);
  // 4. Validate shipment is accessible despite being soft-deleted
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    mockShipment.id,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipment.carrierName,
    mockShipment.carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.trackingNumber,
    mockShipment.trackingNumber,
  );
  TestValidator.equals(
    "order number matches",
    retrievedShipment.order.order_number,
    mockShipment.order.order_number,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedShipment.seller.email,
    mockShipment.seller.email,
  );
  // 5. Validate soft-deletion timestamp is preserved
  TestValidator.equals(
    "deletedAt is preserved",
    retrievedShipment.deletedAt,
    deletedAtTimestamp,
  );
  TestValidator.predicate(
    "deletedAt is not null",
    retrievedShipment.deletedAt !== null,
  );
  // 6. Validate all other fields are still accessible for audit purposes
  TestValidator.predicate(
    "created_at is valid",
    new Date(retrievedShipment.createdAt) instanceof Date,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(retrievedShipment.updatedAt) instanceof Date,
  );
}
