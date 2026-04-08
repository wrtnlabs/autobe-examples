import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_admin_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Search refund requests with future date range (no matching records possible)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const oneDayLater = new Date(futureDate.getTime() + 24 * 60 * 60 * 1000);
  const result = await api.functional.ecommerceMall.admin.refund_requests.index(
    adminConnection,
    {
      body: {
        requestedAtFrom: futureDate.toISOString(),
        requestedAtTo: oneDayLater.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallRefundRequest.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate empty result set with proper pagination metadata
  TestValidator.equals("data array should be empty", result.data.length, 0);
  TestValidator.equals(
    "pagination records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    result.pagination.limit,
    20,
  );
}
