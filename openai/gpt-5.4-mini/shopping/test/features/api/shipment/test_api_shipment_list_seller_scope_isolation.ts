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

export async function test_api_shipment_list_seller_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller shipment list scope isolation.
   *
   * Verifies that the shipment browsing endpoint only returns shipments owned
   * by the authenticated seller and does not leak records from other sellers.
   * The test uses two independently authenticated seller connections and checks
   * that every returned shipment is scoped to the requesting seller.
   *
   * 1. Register two separate seller accounts.
   * 2. Query the shipment list as the first seller.
   * 3. Assert the payload is valid and paginated.
   * 4. Ensure returned shipments never reference the second seller.
   */
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: `seller-a-${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerA);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: `seller-b-${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerB);
  const page = await api.functional.mallPlatform.seller.shipments.index(
    sellerAConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "shipment pagination is valid",
    page.pagination.current >= 1 &&
      page.pagination.limit >= 0 &&
      page.pagination.pages >= 0 &&
      page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "shipment list contains only the authenticated seller's records",
    page.data.every((shipment) => shipment.seller.id === sellerA.id),
  );
  TestValidator.predicate(
    "shipment list excludes other seller records",
    page.data.every((shipment) => shipment.seller.id !== sellerB.id),
  );
}
