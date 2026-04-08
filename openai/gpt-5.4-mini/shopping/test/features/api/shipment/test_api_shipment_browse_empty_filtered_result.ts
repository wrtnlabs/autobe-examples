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

export async function test_api_shipment_browse_empty_filtered_result(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that seller shipment browsing returns an empty but valid page when filters match nothing.
   *
   * This test authenticates a fresh seller account, then queries the seller shipment browse endpoint with a combination of valid filters that should exclude all accessible shipments. The response is validated as a normal paginated page with no records and no data rows.
   *
   * 1. Register and authenticate a seller account using an isolated connection.
   * 2. Query the seller shipment browse endpoint with filters that should return no rows.
   * 3. Validate the response is a normal empty page with consistent pagination metadata.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` satisfies string,
      password: `${RandomGenerator.alphaNumeric(16)}1!` satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const response = await api.functional.mallPlatform.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        status: "delivered",
        carrierName: RandomGenerator.alphaNumeric(20),
        trackingNumber: RandomGenerator.alphaNumeric(24),
        createdAtFrom: "2999-01-01T00:00:00.000Z",
        createdAtTo: "2999-01-02T00:00:00.000Z",
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "empty shipment page records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty shipment page data length",
    response.data.length,
    0,
  );
  TestValidator.equals(
    "empty shipment page current",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty shipment page limit",
    response.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty shipment page pages",
    response.pagination.pages,
    0,
  );
}
