import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_retrieval_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secret123",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Retrieve shipments with pagination parameters
  const orderID = typia.random<string & tags.Format<"uuid">>();
  const shipmentsPage =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        id: orderID,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(shipmentsPage);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current matches requested page",
    shipmentsPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    shipmentsPage.pagination.limit,
    5,
  );
  // 4. Validate data subset
  if (shipmentsPage.data.length > 0) {
    TestValidator.predicate(
      "data length should be <= limit (5)",
      shipmentsPage.data.length <= 5,
    );
  }
}
