import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refund_requests_filter_by_customer_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // Step 2: Test filtering by customerId
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const resultByCustomer =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          customerId,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(resultByCustomer);
  TestValidator.equals(
    "empty result for non-existent customer",
    resultByCustomer.data.length,
    0,
  );
  // Step 3: Test filtering by search text
  const resultBySearch =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: "non-existent refund reason text",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(resultBySearch);
  TestValidator.equals(
    "empty result for non-matching search",
    resultBySearch.data.length,
    0,
  );
  // Step 4: Test combining customerId and search filters
  const resultByBoth =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          customerId,
          search: "damaged",
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(resultByBoth);
  TestValidator.equals(
    "empty result for combined filters",
    resultByBoth.data.length,
    0,
  );
  // Step 5: Test filtering by sellerId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const resultBySeller =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          sellerId,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(resultBySeller);
  TestValidator.equals(
    "empty result for non-existent seller",
    resultBySeller.data.length,
    0,
  );
  // Step 6: Test pagination parameters
  const resultPaginated =
    await api.functional.eCommerceMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IECommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(resultPaginated);
  TestValidator.equals(
    "paginated result data is empty",
    resultPaginated.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    resultPaginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    resultPaginated.pagination.limit,
    10,
  );
}
