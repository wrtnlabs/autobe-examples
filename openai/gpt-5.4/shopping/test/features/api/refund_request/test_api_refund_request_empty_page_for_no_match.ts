import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_empty_page_for_no_match(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const createdAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 31,
  ).toISOString();
  const reviewedAtFrom = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 32,
  ).toISOString();
  const reviewedAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 33,
  ).toISOString();
  const deliveredAtFrom = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 34,
  ).toISOString();
  const deliveredAtTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 35,
  ).toISOString();
  const request = {
    search: RandomGenerator.alphaNumeric(12),
    status: "pending",
    reviewerRole: "seller",
    orderCode: `ORD-NO-MATCH-${RandomGenerator.alphaNumeric(8)}`,
    createdAtFrom,
    createdAtTo,
    reviewedAtFrom,
    reviewedAtTo,
    deliveredAtFrom,
    deliveredAtTo,
    sort: "+created_at",
    page: 1,
    limit: 10,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const page = await api.functional.shoppingMall.customer.refund_requests.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "requested page is preserved",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is preserved",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals("no matching records count", page.pagination.records, 0);
  TestValidator.equals(
    "no available pages for zero records",
    page.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty data returned for no-match query",
    page.data.length,
    0,
  );
  TestValidator.predicate(
    "out-of-scope refund requests are not surfaced",
    page.data.length === 0,
  );
}
