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

export async function test_api_refund_request_customer_scope_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customer);
  const request = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const page = await api.functional.shoppingMall.customer.refund_requests.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "current page matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", page.pagination.limit, 10);
  TestValidator.predicate(
    "data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages align with records and limit",
    page.pagination.limit === 0
      ? page.pagination.pages === 0
      : page.pagination.pages ===
          Math.ceil(page.pagination.records / page.pagination.limit),
  );
  for (const summary of page.data) {
    typia.assert(summary);
    TestValidator.equals(
      "summary customer matches authorized customer",
      summary.customer.id,
      customer.id,
    );
    TestValidator.equals(
      "customer email matches authorized customer",
      summary.customer.email,
      customer.email,
    );
    TestValidator.predicate(
      "summary reason is present",
      summary.reason.length > 0,
    );
    TestValidator.predicate(
      "summary status is present",
      summary.status.length > 0,
    );
    TestValidator.predicate(
      "reviewed record has review timestamp or unreviewed record keeps null timestamp",
      summary.reviewed_at === null || summary.reviewed_at.length > 0,
    );
  }
}
