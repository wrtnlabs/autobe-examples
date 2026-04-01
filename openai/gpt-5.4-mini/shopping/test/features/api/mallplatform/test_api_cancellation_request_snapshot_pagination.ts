import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const page1 =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 data length within limit",
    page1.data.length <= page1.pagination.limit,
  );
  TestValidator.equals(
    "page count consistent with total records",
    page1.pagination.pages,
    page1.pagination.records === 0
      ? 0
      : Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  if (page1.data.length > 1) {
    TestValidator.predicate(
      "default ordering is newest-first",
      page1.data.every(
        (snapshot, index, array) =>
          index === 0 || array[index - 1].changedAt >= snapshot.changedAt,
      ),
    );
  }
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
        customerConnection,
        {
          orderItemId,
          cancellationRequestId,
          body: {
            page: 2,
            limit: 2,
          } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
    TestValidator.predicate(
      "page 2 data length within limit",
      page2.data.length <= page2.pagination.limit,
    );
    TestValidator.equals(
      "page 2 total records matches page 1",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.predicate(
      "pages do not overlap across adjacent results",
      page1.data.every(
        (left) => !page2.data.some((right) => right.id === left.id),
      ),
    );
  }
  const sortedPage =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: {
          page: 1,
          limit: 2,
          sort: "changedAt",
        } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(sortedPage);
  TestValidator.equals("sorted page current", sortedPage.pagination.current, 1);
  TestValidator.equals("sorted page limit", sortedPage.pagination.limit, 2);
  TestValidator.equals(
    "sorted page total records matches default page",
    sortedPage.pagination.records,
    page1.pagination.records,
  );
  if (sortedPage.data.length > 1) {
    TestValidator.predicate(
      "explicit sort is reflected in non-increasing or non-decreasing changedAt order",
      sortedPage.data.every(
        (snapshot, index, array) =>
          index === 0 || array[index - 1].changedAt >= snapshot.changedAt,
      ) ||
        sortedPage.data.every(
          (snapshot, index, array) =>
            index === 0 || array[index - 1].changedAt <= snapshot.changedAt,
        ),
    );
  }
}
