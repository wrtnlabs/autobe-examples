import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipments_list_own_shipments_only(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>() as string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: seller.token.access,
  };
  const firstPage = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "-created_at",
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "pagination record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const shipment of firstPage.data) {
    TestValidator.equals(
      "shipment belongs to authenticated seller",
      shipment.seller.id,
      seller.id,
    );
  }
  const secondPage = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 2,
        limit: 1,
        sort: "-created_at",
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 1);
  TestValidator.predicate(
    "second page data length does not exceed limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  for (const shipment of secondPage.data) {
    TestValidator.equals(
      "second page shipment belongs to authenticated seller",
      shipment.seller.id,
      seller.id,
    );
  }
}
