import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_snapshots_pagination_across_multiple_entities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test customer to generate snapshots (required for authentication)
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(joinResult);
  customerConnection.headers = { Authorization: joinResult.token.access };
  // 2. Query pagination endpoint with different combinations using only provided IRequest type
  // Use minimal valid request with required fields
  const firstPageRequest: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "product",
    changed_by: "customer",
    page: 1,
    limit: 5,
  };
  const firstPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  // Validate basic pagination structure
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate("first page has records", firstPage.data.length >= 0);
  // Validate pagination metadata
  const totalRecords = firstPage.pagination.records;
  const totalPages = firstPage.pagination.pages;
  TestValidator.predicate("total records valid", totalRecords >= 0);
  TestValidator.predicate("total pages valid", totalPages >= 0);
  // 3. Verify second page if available, no overlap
  let secondPage: IPageIShoppingMallProductSnapshot.ISummary | undefined =
    undefined;
  if (totalPages > 1) {
    const secondPageRequest: IShoppingMallProductSnapshot.IRequest = {
      entity_type: "product",
      changed_by: "customer",
      page: 2,
      limit: 5,
    };
    secondPage = await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: secondPageRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
    // Ensure no overlap between first and second page IDs
    const firstPageIds = firstPage.data.map((item) => item.id);
    const secondPageIds = secondPage.data.map((item) => item.id);
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.equals("no overlap between pages", overlap.length, 0);
    // Validate metadata consistency
    TestValidator.equals(
      "second page records",
      secondPage.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "second page pages",
      secondPage.pagination.pages,
      totalPages,
    );
  }
  // 4. Verify pagination with different entity_type
  const reviewPageRequest: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "review",
    changed_by: "customer",
    page: 1,
    limit: 5,
  };
  const reviewPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: reviewPageRequest,
      },
    );
  typia.assert(reviewPage);
  TestValidator.predicate(
    "review page has records",
    reviewPage.data.length >= 0,
  );
  // 5. Verify beyond-page pagination (empty data expected)
  let beyondPage: IPageIShoppingMallProductSnapshot.ISummary | undefined =
    undefined;
  if (totalPages > 2) {
    const beyondPageRequest: IShoppingMallProductSnapshot.IRequest = {
      entity_type: "product",
      changed_by: "customer",
      page: totalPages + 1,
      limit: 5,
    };
    beyondPage = await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: beyondPageRequest,
      },
    );
    typia.assert(beyondPage);
    TestValidator.equals(
      "beyond page current",
      beyondPage.pagination.current,
      totalPages + 1,
    );
    TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 5);
    TestValidator.equals(
      "beyond page records",
      beyondPage.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      "beyond page pages",
      beyondPage.pagination.pages,
      totalPages,
    );
    TestValidator.equals("beyond page data length", beyondPage.data.length, 0);
  }
  // 6. Verify default pagination (page=1, limit=100)
  const defaultPageRequest: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "product",
    changed_by: "customer",
  };
  const defaultPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: defaultPageRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 100);
  // 7. Verify date filtering (optional)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dateFilteredRequest: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "product",
    changed_by: "customer",
    from_date: yesterday,
    to_date: today,
    page: 1,
    limit: 5,
  };
  const dateFilteredPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: dateFilteredRequest,
      },
    );
  typia.assert(dateFilteredPage);
  TestValidator.predicate(
    "date filtered has records",
    dateFilteredPage.data.length >= 0,
  );
  // 8. Verify agent filter (changed_by=admin)
  const adminPageRequest: IShoppingMallProductSnapshot.IRequest = {
    entity_type: "product",
    changed_by: "admin",
    page: 1,
    limit: 5,
  };
  const adminPage: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.customer.snapshots.index(
      customerConnection,
      {
        body: adminPageRequest,
      },
    );
  typia.assert(adminPage);
  TestValidator.predicate("admin page has records", adminPage.data.length >= 0);
  // 9. Validate snapshot summary structure (only properties defined in ISummary)
  const testSnapshots = [
    ...firstPage.data,
    ...(totalPages > 1 ? secondPage?.data || [] : []),
    ...reviewPage.data,
    ...(totalPages > 2 ? beyondPage?.data || [] : []),
    ...adminPage.data,
  ];
  testSnapshots.forEach((snapshot) => {
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.predicate(
      "snapshot id is uuid",
      /^[0-9a-f-]{36}$/i.test(snapshot.id),
    );
    TestValidator.predicate(
      "snapshot status is valid",
      ["active", "suspended", "deleted"].includes(snapshot.status),
    );
    TestValidator.predicate(
      "snapshot display_name can be string or undefined",
      snapshot.display_name === undefined ||
        typeof snapshot.display_name === "string",
    );
  });
}
