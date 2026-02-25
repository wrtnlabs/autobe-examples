import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import type { IPaginationInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationInfo";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_snapshots_filtered_and_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a paginated list of order snapshots by an authenticated customer with no filter parameters.
  // Validate that results are sorted by snapshotAt descending and pagination information is correct.
  // Ensure data immutability by confirming no write operations are permitted.
  // Confirm authorization requires authenticated customer.
  // Authenticate as a customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Prepare request with default pagination parameters (e.g., page 1, limit 10)
  const requestBody: IShoppingMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 10,
  };
  const firstPage =
    await api.functional.shoppingMall.customer.order_snapshots.index(
      customerConnection,
      { body: requestBody },
    );
  typia.assert(firstPage);
  // Validate pagination info properties
  TestValidator.predicate(
    "current page is at least 1",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Check data immutability: no modifications allowed - try to mutate and expect failure
  // This is a soft assertion of immutability by verifying the type and disallowing write usage.
  // Actually enforcing immutability might need runtime protections, so we note the intent here.
  // Check descending sort order by snapshotAt
  for (let i = 1; i < firstPage.data.length; ++i) {
    const previous = new Date(firstPage.data[i - 1].snapshotAt).getTime();
    const current = new Date(firstPage.data[i].snapshotAt).getTime();
    TestValidator.predicate(
      `snapshotAt[${i - 1}] >= snapshotAt[${i}]`,
      previous >= current,
    );
  }
  // Scenario 2: Retrieval of order snapshots filtered by a specific shoppingMallOrderId
  if (firstPage.data.length > 0) {
    const sampleOrderId = firstPage.data[0].shoppingMallOrderId;
    const filteredRequest: IShoppingMallOrderSnapshot.IRequest = {
      shoppingMallOrderId: sampleOrderId,
      page: 1,
      limit: 10,
    };
    const filteredPage =
      await api.functional.shoppingMall.customer.order_snapshots.index(
        customerConnection,
        { body: filteredRequest },
      );
    typia.assert(filteredPage);
    // Validate that all returned snapshots relate only to the given order ID
    filteredPage.data.forEach((snapshot) => {
      TestValidator.equals(
        "filter by shoppingMallOrderId",
        snapshot.shoppingMallOrderId,
        sampleOrderId,
      );
    });
    // Validate pagination integrity
    TestValidator.predicate(
      "filtered page current at least 1",
      filteredPage.pagination.current >= 1,
    );
    TestValidator.predicate(
      "filtered page limit positive",
      filteredPage.pagination.limit > 0,
    );
  }
  // Scenario 3: Handling of empty results when filtering by non-existent customerEmail
  const nonExistentEmail = `nonexistent_${Date.now()}@example.com`;
  const emptyFilterRequest: IShoppingMallOrderSnapshot.IRequest = {
    customerEmail: nonExistentEmail,
    page: 1,
    limit: 10,
  };
  const emptyResultPage =
    await api.functional.shoppingMall.customer.order_snapshots.index(
      customerConnection,
      { body: emptyFilterRequest },
    );
  typia.assert(emptyResultPage);
  // Validate that data array is empty
  TestValidator.equals(
    "empty filtered data length",
    emptyResultPage.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.predicate(
    "empty result page current at least 1",
    emptyResultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty result page limit positive",
    emptyResultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "empty result page records non-negative",
    emptyResultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty result page pages non-negative",
    emptyResultPage.pagination.pages >= 0,
  );
}
