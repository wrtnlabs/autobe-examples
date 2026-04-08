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

export async function test_api_shipment_pending_queue_empty_page(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies the seller pending shipment queue returns an empty page when no
   * actionable shipments match the provided filters.
   *
   * The test authenticates a seller account, queries the pending shipment queue
   * with criteria designed to avoid matches, and validates that the response is
   * an empty pagination result rather than an error.
   *
   * 1. Register and authenticate a seller account.
   * 2. Query the pending shipment queue with filters that should match no rows.
   * 3. Validate that the page metadata indicates an empty result set.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const emptyPage =
    await api.functional.mallPlatform.seller.shipments.pending.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "nonexistent-status",
          carrierName: "no-such-carrier",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty queue current page",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals("empty queue limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("empty queue records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty queue pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty queue data", emptyPage.data.length, 0);
}
