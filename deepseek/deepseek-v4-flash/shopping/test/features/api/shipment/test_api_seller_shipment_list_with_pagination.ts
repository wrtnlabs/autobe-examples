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

export async function test_api_seller_shipment_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call with default (empty) request body — no filters, default pagination
  const page1 = await api.functional.eCommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {} satisfies IECommerceMallShipment.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Call with explicit pagination: page=1, limit=5
  const page2 = await api.functional.eCommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IECommerceMallShipment.IRequest,
    },
  );
  typia.assert(page2);
  // 4. Verify pagination parameters are respected
  TestValidator.equals("current page is 1", page2.pagination.current, 1);
  TestValidator.equals("limit is 5", page2.pagination.limit, 5);
  // 5. Verify data is an array (even if empty for a new seller)
  TestValidator.predicate("data is an array", () => Array.isArray(page1.data));
  TestValidator.predicate("data is an array (explicit pagination)", () =>
    Array.isArray(page2.data),
  );
}
