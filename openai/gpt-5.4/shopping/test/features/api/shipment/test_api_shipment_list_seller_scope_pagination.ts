import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_list_seller_scope_pagination(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  const pageNumber = 1 satisfies number as number;
  const pageLimit = 10 satisfies number as number;
  const request = {
    page: pageNumber,
    limit: pageLimit,
  } satisfies IShoppingMallShipment.IRequest;
  const page: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: request,
    });
  typia.assert(page);
  TestValidator.equals(
    "pagination current page",
    page.pagination.current,
    pageNumber,
  );
  TestValidator.equals("pagination limit", page.pagination.limit, pageLimit);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length within limit",
    page.data.length <= pageLimit,
  );
  const shipmentIds = new Set<string>();
  for (const shipment of page.data) {
    TestValidator.equals(
      "shipment seller id matches authenticated seller",
      shipment.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "shipment seller email matches authenticated seller",
      shipment.seller.email,
      seller.email,
    );
    TestValidator.predicate(
      "shipment id is unique within page",
      shipmentIds.has(shipment.id) === false,
    );
    shipmentIds.add(shipment.id);
  }
  const repeated: IPageIShoppingMallShipment.ISummary =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: request,
    });
  typia.assert(repeated);
  TestValidator.equals(
    "repeated request keeps same pagination current",
    repeated.pagination.current,
    page.pagination.current,
  );
  TestValidator.equals(
    "repeated request keeps same pagination limit",
    repeated.pagination.limit,
    page.pagination.limit,
  );
  TestValidator.equals(
    "repeated request keeps same shipment ordering",
    repeated.data.map((shipment) => shipment.id),
    page.data.map((shipment) => shipment.id),
  );
}
