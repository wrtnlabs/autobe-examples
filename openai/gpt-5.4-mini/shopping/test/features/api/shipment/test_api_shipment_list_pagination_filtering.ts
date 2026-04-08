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

export async function test_api_shipment_list_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const request = {
    page: 1,
    limit: 10,
    sort: "newest",
    status: "shipped",
  } satisfies IMallPlatformShipment.IRequest;
  const output = await api.functional.mallPlatform.seller.shipments.index(
    sellerConnection,
    {
      body: request,
    },
  );
  typia.assert(output);
  TestValidator.equals(
    "requested page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "requested limit",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned page size within limit",
    output.data.length <= output.pagination.limit,
  );
  for (const shipment of output.data) {
    TestValidator.predicate(
      "seller summary id is present",
      shipment.seller.id.length > 0,
    );
    TestValidator.predicate(
      "seller summary email is present",
      shipment.seller.email.length > 0,
    );
    TestValidator.predicate(
      "order summary id is present",
      shipment.order.id.length > 0,
    );
    TestValidator.predicate(
      "order number is present",
      shipment.order.orderNumber.length > 0,
    );
    TestValidator.predicate(
      "carrier name present",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "tracking number present",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "createdAt is not in the future",
      new Date(shipment.createdAt).getTime() <= Date.now(),
    );
  }
}
