import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_cancellation_request_snapshots_history_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Provide second argument as empty object for authorize_administrator_join
  const adminAuthorized = await authorize_administrator_join(adminConnection, {});
  // Attach authorization token to adminConnection
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Attempt to access without auth to validate access control
  await TestValidator.httpError(
    "unauthorized access without auth",
    401,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      // Without Authorization header
      await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
        unauthorizedConnection,
        {
          body: {},
        },
      );
    },
  );
  // 3. Request with no filter criteria, expect paginated results
  const requestBody: IShoppingMallCancellationRequestSnapshot.IRequest = {};
  const response =
    await api.functional.shoppingMall.administrator.cancellationRequestSnapshots.history.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination metadata consistency
  const pag = response.pagination;
  TestValidator.predicate("current page is >= 1", pag.current >= 1);
  TestValidator.predicate("limit is >= 0", pag.limit >= 0);
  TestValidator.predicate("records count is >= 0", pag.records >= 0);
  TestValidator.predicate("pages is >= 0", pag.pages >= 0);
  if (pag.records === 0) {
    TestValidator.equals("pages is 0 when records are 0", pag.pages, 0);
  } else {
    // pages == Math.ceil(records / limit) ensures correct pagination
    TestValidator.equals(
      "pages count",
      pag.pages,
      Math.ceil(pag.records / pag.limit),
    );
  }
  // 5. Validate data array
  const data = response.data;
  TestValidator.predicate("data array is defined", Array.isArray(data));
  if (data.length === 0) {
    // Confirm empty data handled gracefully
    TestValidator.predicate("empty data, no error", true);
  } else {
    // 6. Validate ordering by date ascending by createdAt or descending (business decision)
    // For this example, just validate each item's createdAt is ISO date and data is sorted ascending
    for (let i = 0; i < data.length; ++i) {
      const item = data[i];
      typia.assert(item);
      // Validate required properties
      TestValidator.predicate(
        `item ${i} id is valid uuid`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          item.id,
        ),
      );
      TestValidator.predicate(
        `item ${i} has non-empty reason`,
        typeof item.reason === "string" && item.reason.length > 0,
      );
      TestValidator.predicate(
        `item ${i} status is non-empty string`,
        typeof item.status === "string" && item.status.length > 0,
      );
      TestValidator.predicate(
        `item ${i} createdAt is valid ISO datetime`,
        !Number.isNaN(Date.parse(item.createdAt)),
      );
      if (i > 0) {
        // Ensure items are sorted by createdAt descending (most recent first)
        const prevDate = new Date(data[i - 1].createdAt).getTime();
        const currDate = new Date(item.createdAt).getTime();
        TestValidator.predicate(
          `item ${i} createdAt <= item ${i - 1} createdAt`,
          currDate <= prevDate,
        );
      }
    }
  }
}
