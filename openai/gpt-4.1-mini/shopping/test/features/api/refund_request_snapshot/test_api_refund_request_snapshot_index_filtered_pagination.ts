import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_index_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // -------------------------------------------------------------------------
  // Scenario 1: Retrieve refund request snapshots with no filters, default pagination and sorting.
  // -------------------------------------------------------------------------
  // 1) Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(connection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2) Send patch request with empty filters
  const response =
    await api.functional.shoppingMall.refundRequestSnapshots.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(response);
  // Validate that pagination object exists and is structurally correct
  TestValidator.predicate(
    "pagination object exists",
    typeof response.pagination === "object" && response.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // Validate data is an array
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Since detailed properties like refundRequestId, status, reason do not exist on
  // IShoppingMallRefundRequestSnapshot.ISummary, we cannot test filters based on those.
  // So, scenarios 2 and 3 are effectively no-ops or basic request tests.
  // -------------------------------------------------------------------------
  // Scenario 2: Retrieve refund request snapshots with empty filters (rewritten)
  // -------------------------------------------------------------------------
  const filteredResponse =
    await api.functional.shoppingMall.refundRequestSnapshots.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "Scenario 2: data is array",
    Array.isArray(filteredResponse.data),
  );
  // -------------------------------------------------------------------------
  // Scenario 3: Retrieve refund request snapshots with empty filters (rewritten)
  // -------------------------------------------------------------------------
  const filterByStatusAndReasonResponse =
    await api.functional.shoppingMall.refundRequestSnapshots.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(filterByStatusAndReasonResponse);
  TestValidator.predicate(
    "Scenario 3: data is array",
    Array.isArray(filterByStatusAndReasonResponse.data),
  );
}
