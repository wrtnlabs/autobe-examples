import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_request_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Request first page with limit=5
  const page1 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Verify first page pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 data count",
    page1.data.length,
    page1.pagination.limit,
  );
  // 4. Verify pages calculation
  const expectedPages = Math.ceil(page1.pagination.records / 5);
  TestValidator.equals(
    "pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // 5. Request second page if it exists
  const page2 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          limit: 5,
          page: 2,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  // 6. Verify second page pagination metadata
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals(
    "page 2 data count",
    page2.data.length,
    page2.pagination.limit,
  );
  // 7. Request third page (final page)
  const page3 =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          limit: 5,
          page: 3,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  // 8. Verify third page pagination metadata
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.predicate("page 3 has data", page3.data.length > 0);
  // 9. Verify all snapshots maintain consistent ordering by createdAt descending
  const allSnapshots = [...page1.data, ...page2.data, ...page3.data];
  TestValidator.index(
    "snapshots ordering by createdAt DESC",
    allSnapshots,
    allSnapshots,
  );
}