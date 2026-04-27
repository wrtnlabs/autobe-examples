import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test with full date range (both created_at_from and created_at_to)
  const fullRangeResult =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: "2026-01-01T00:00:00Z",
          created_at_to: "2026-12-31T23:59:59Z",
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fullRangeResult);
  for (const item of fullRangeResult.data) {
    TestValidator.predicate(
      `cancellation request ${item.id} created_at within range`,
      item.created_at >= "2026-01-01T00:00:00Z" &&
        item.created_at <= "2026-12-31T23:59:59Z",
    );
  }
  // 3. Test with only created_at_from (no end)
  const fromOnlyResult =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_from: "2026-01-01T00:00:00Z",
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fromOnlyResult);
  for (const item of fromOnlyResult.data) {
    TestValidator.predicate(
      `cancellation request ${item.id} created_at >= from`,
      item.created_at >= "2026-01-01T00:00:00Z",
    );
  }
  // 4. Test with only created_at_to (no start)
  const toOnlyResult =
    await api.functional.eCommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          created_at_to: "2026-12-31T23:59:59Z",
        } satisfies IECommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(toOnlyResult);
  for (const item of toOnlyResult.data) {
    TestValidator.predicate(
      `cancellation request ${item.id} created_at <= to`,
      item.created_at <= "2026-12-31T23:59:59Z",
    );
  }
}
