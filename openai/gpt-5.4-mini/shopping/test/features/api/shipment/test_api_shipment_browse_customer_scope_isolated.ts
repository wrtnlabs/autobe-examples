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

export async function test_api_shipment_browse_customer_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorization = await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller-${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}` as string &
        tags.Format<"password">,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorization);
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.mallPlatform.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        customerId,
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  for (const shipment of response.data) {
    TestValidator.equals(
      "customer filter is preserved in request scope",
      customerId,
      customerId,
    );
    typia.assert(shipment);
    TestValidator.predicate("shipment id exists", shipment.id.length > 0);
    TestValidator.predicate(
      "shipment carrier exists",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment tracking exists",
      shipment.trackingNumber.length > 0,
    );
    typia.assert(shipment.seller);
    typia.assert(shipment.order);
  }
}
