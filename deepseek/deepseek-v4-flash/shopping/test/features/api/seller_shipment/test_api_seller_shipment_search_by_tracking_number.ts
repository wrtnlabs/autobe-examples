import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_search_by_tracking_number(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Test 1: Search by tracking number with unique string (no match)
  const noMatchTracking =
    await api.functional.eCommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          trackingNumber: RandomGenerator.alphaNumeric(32),
        } satisfies IECommerceMallShipment.IRequest,
      },
    );
  typia.assert(noMatchTracking);
  TestValidator.equals(
    "trackingNumber no match - empty data",
    noMatchTracking.data.length,
    0,
  );
  TestValidator.equals(
    "trackingNumber no match - zero records",
    noMatchTracking.pagination.records,
    0,
  );
  TestValidator.equals(
    "trackingNumber no match - zero pages",
    noMatchTracking.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "trackingNumber no match - pagination current is 1 or 0",
    () =>
      noMatchTracking.pagination.current === 1 ||
      noMatchTracking.pagination.current === 0,
  );
  // Test 2: Search by carrier name with unique string (no match)
  const noMatchCarrier =
    await api.functional.eCommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.alphaNumeric(32),
        } satisfies IECommerceMallShipment.IRequest,
      },
    );
  typia.assert(noMatchCarrier);
  TestValidator.equals(
    "carrierName no match - empty data",
    noMatchCarrier.data.length,
    0,
  );
  TestValidator.equals(
    "carrierName no match - zero records",
    noMatchCarrier.pagination.records,
    0,
  );
  TestValidator.equals(
    "carrierName no match - zero pages",
    noMatchCarrier.pagination.pages,
    0,
  );
  // Test 3: Search with both trackingNumber and carrierName combined (no match)
  const noMatchBoth = await api.functional.eCommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        trackingNumber: RandomGenerator.alphaNumeric(32),
        carrierName: RandomGenerator.alphaNumeric(32),
      } satisfies IECommerceMallShipment.IRequest,
    },
  );
  typia.assert(noMatchBoth);
  TestValidator.equals(
    "combined no match - empty data",
    noMatchBoth.data.length,
    0,
  );
  TestValidator.equals(
    "combined no match - zero records",
    noMatchBoth.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined no match - zero pages",
    noMatchBoth.pagination.pages,
    0,
  );
}
