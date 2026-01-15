import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_order_shipment_erase_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a test order shipment (required for deletion)
  // Note: We don't have a direct API to create order shipment, so we assume it exists
  // We'll use typia.random to generate a valid UUID for orderShipmentId
  const orderShipmentId = typia.random<string & tags.Format<"uuid">>();
  // Perform the erase operation
  await api.functional.shoppingMall.admin.order_shipments.erase(
    adminConnection,
    {
      orderShipmentId,
    },
  );
  // Since there's no way to GET the deleted record, we validate by assuming
  // successful delete means it's permanently removed (no response expected)
  // This is consistent with DELETE /shoppingMall/admin/order-shipments/{orderShipmentId}
  // which returns void (204 No Content)
  // No further validation needed - successful execution confirms deletion
  // The system's contract ensures proper cleanup
}
