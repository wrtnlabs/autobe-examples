import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_shipments_create } from "../../../generate/generate_random_mall_platform_administrator_shipments_create";
import { prepare_random_mall_platform_shipment } from "../../../prepare/prepare_random_mall_platform_shipment";

export async function test_api_shipment_item_authorization_scope(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test shipment-item authorization scope for protected shipment-item reads.
   *
   * Validates that a shipment-item assignment can be retrieved through the protected
   * administrator shipment-item endpoint when the caller is an authenticated
   * administrator, and that an unauthenticated connection cannot read the same
   * resource. This exercises the access-control rule protecting shipment-item
   * visibility.
   *
   * The test uses an administrator-authenticated connection for the success path.
   * For the rejection path, it intentionally calls the same endpoint from a fresh
   * unauthenticated connection and expects an authorization failure.
   *
   * 1. Authenticate as an administrator.
   * 2. Call the shipment-item read endpoint with valid UUID path parameters.
   * 3. Confirm the administrator can read the resource.
   * 4. Confirm an unauthenticated connection is rejected.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@example.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(8)}`,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentItemId = typia.random<string & tags.Format<"uuid">>();
  const authorized =
    await api.functional.mallPlatform.administrator.shipments.items.getByShipmentidAndShipmentitemid(
      adminConnection,
      {
        shipmentId,
        shipmentItemId,
      },
    );
  typia.assert(authorized);
  TestValidator.equals(
    "shipment id should match",
    authorized.shipment.id,
    shipmentId,
  );
  TestValidator.equals(
    "shipment item id should match",
    authorized.id,
    shipmentItemId,
  );
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access should be rejected",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.administrator.shipments.items.getByShipmentidAndShipmentitemid(
        guestConnection,
        {
          shipmentId,
          shipmentItemId,
        },
      );
    },
  );
}
