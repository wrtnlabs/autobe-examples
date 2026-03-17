import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_cancellation_request_browse_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const futureFrom = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const futureTo = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 366,
  ).toISOString();
  const body = {
    status: `unmatched-status-${RandomGenerator.alphabets(8)}`,
    reviewedByType: `unmatched-reviewer-${RandomGenerator.alphabets(8)}`,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    createdAtFrom: futureFrom,
    createdAtTo: futureTo,
    page: 2,
    limit: 7,
  } satisfies IShoppingMallCancellationRequest.IRequest;
  const page: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body,
      },
    );
  typia.assert(page);
  TestValidator.equals("empty data array", page.data.length, 0);
  TestValidator.equals(
    "pagination current preserved",
    page.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit preserved", page.pagination.limit, 7);
  TestValidator.equals("empty result records", page.pagination.records, 0);
  TestValidator.equals("empty result pages", page.pagination.pages, 0);
}
