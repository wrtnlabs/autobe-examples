import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies seller-only access to the pending shipment queue.
 *
 * This test creates a dedicated seller session and exercises the pending shipment queue endpoint through that actor-specific connection.
 * It validates that a seller-authenticated user can inspect the paginated shipment queue response and that the result is structurally valid.
 *
 * 1. Register and authenticate a seller account using a dedicated seller connection.
 * 2. Request the pending shipment queue through the seller session.
 * 3. Validate the paginated response and confirm the queue is accessible to the seller actor.
 */
export async function test_api_shipment_pending_queue_seller_only_access(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!@#",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const queue =
    await api.functional.mallPlatform.seller.shipments.pending.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(queue);
  TestValidator.predicate(
    "seller session is authenticated",
    seller.token.access.length > 0,
  );
  TestValidator.predicate(
    "pending shipment queue response is paginated",
    queue.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pending shipment queue data is readable by seller",
    Array.isArray(queue.data),
  );
  TestValidator.predicate(
    "pending shipment queue response has valid pagination",
    queue.pagination.current >= 1,
  );
}
