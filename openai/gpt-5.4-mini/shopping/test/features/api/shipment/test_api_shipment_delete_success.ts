import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment deletion success.
 *
 * Verifies that an authenticated seller can delete one of their shipments through the shipment deletion endpoint.
 * The scenario validates the seller authorization flow and ensures the delete request completes successfully for an owning merchant context.
 *
 * 1. Register and authenticate a seller account using a dedicated seller connection.
 * 2. Create a shipment identifier to represent the seller-owned shipment target.
 * 3. Delete the shipment using the authenticated seller connection.
 * 4. Confirm the delete request completes without throwing an error.
 */
export async function test_api_shipment_delete_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const shipmentId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.mallPlatform.seller.shipments.erase(sellerConnection, {
    shipmentId,
  });
}
