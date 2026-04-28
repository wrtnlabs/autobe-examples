import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Tests seller shipment search when seller has no shipments.
 *
 * Validates the empty result set handling for the seller shipment search endpoint.
 * A seller with no created shipments receives a properly paginated response with
 * an empty data array and pagination metadata indicating zero total records
 * and zero total pages.
 *
 * 1. Seller registers and authenticates via the seller join endpoint.
 * 2. Seller searches their shipments with no filter criteria.
 * 3. Validates the response returns an empty data array.
 * 4. Validates pagination shows zero records and zero pages.
 */
export async function test_api_seller_shipment_search_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: undefined });
  // 2. Search for shipments (seller has none)
  const response =
    await api.functional.ecommercePlatform.seller.shipments.index(
      sellerConnection,
      {
        body: {} satisfies IEcommercePlatformShipment.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("total records is zero", response.pagination.records, 0);
  TestValidator.equals("total pages is zero", response.pagination.pages, 0);
}
