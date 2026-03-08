import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_cancellation_requests_pending_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Query pending cancellation requests with page 1, limit 10
  const page1 =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata structure
  TestValidator.predicate("has current page", page1.pagination.current >= 0);
  TestValidator.predicate("has limit", page1.pagination.limit >= 0);
  TestValidator.predicate("has total records", page1.pagination.records >= 0);
  TestValidator.predicate("has total pages", page1.pagination.pages >= 0);
  // 4. Validate data array
  TestValidator.predicate("data is array", Array.isArray(page1.data));
  TestValidator.predicate(
    "page 1 data count matches limit or less",
    page1.data.length <= page1.pagination.limit,
  );
  // 5. Query with different page and limit
  const page2 =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(page2);
  // 6. Validate second page pagination metadata
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2.pagination.limit, 5);
  TestValidator.predicate("page 2 has records", page2.pagination.records >= 0);
  TestValidator.predicate("page 2 has pages", page2.pagination.pages >= 0);
  // 7. Verify pagination consistency - total records should be same
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  // 8. Test with maximum limit (100)
  const maxLimitPage =
    await api.functional.ecommerceMall.admin.cancellation_requests.pending.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  // 9. Validate max limit page
  TestValidator.equals(
    "max limit page limit is 100",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit page data count matches limit or less",
    maxLimitPage.data.length <= 100,
  );
  // 10. Validate cancellation request summary structure
  if (page1.data.length > 0) {
    const firstRequest = page1.data[0];
    TestValidator.predicate("has id", firstRequest.id !== undefined);
    TestValidator.predicate(
      "has orderItemId",
      firstRequest.orderItemId !== undefined,
    );
    TestValidator.predicate("has status", firstRequest.status !== undefined);
    TestValidator.predicate(
      "has requestedAt",
      firstRequest.requestedAt !== undefined,
    );
    TestValidator.predicate(
      "has orderItem",
      firstRequest.orderItem !== undefined,
    );
    TestValidator.predicate(
      "has createdAt",
      firstRequest.createdAt !== undefined,
    );
    TestValidator.predicate(
      "has updatedAt",
      firstRequest.updatedAt !== undefined,
    );
  }
}