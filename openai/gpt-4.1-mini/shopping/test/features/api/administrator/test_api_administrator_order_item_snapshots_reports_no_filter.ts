import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_order_item_snapshots_reports_no_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Retrieve order item snapshots report with no filter (default pagination and sorting)
  // 1. Admin authentication by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Use adminAuthorized token to set headers for further requests
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuthorized.token.access },
  };
  // 2. Send PATCH request with empty filter payload
  const response =
    await api.functional.shoppingMall.administrator.orderItemSnapshots.reports.index(
      authorizedConnection,
      { body: {} },
    );
  // 3. Validate the response type and content
  typia.assert(response);
  // 4. Pagination check
  TestValidator.predicate(
    "pagination current page is greater or equal to 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Data presence check
  TestValidator.predicate(
    "data list is present",
    Array.isArray(response.data) && response.data.length >= 0,
  );
  // 6. Validate each item fields
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate(
      "id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item.id,
      ),
    );
    TestValidator.predicate(
      "productName is non-empty string",
      typeof item.productName === "string" && item.productName.length > 0,
    );
    TestValidator.predicate(
      "variantSku is non-empty string",
      typeof item.variantSku === "string" && item.variantSku.length > 0,
    );
    TestValidator.predicate(
      "quantity is integer and > 0",
      Number.isInteger(item.quantity) && item.quantity > 0,
    );
    TestValidator.predicate(
      "unitPrice is number and >= 0",
      typeof item.unitPrice === "number" && item.unitPrice >= 0,
    );
    TestValidator.predicate(
      "itemStatus is non-empty string",
      typeof item.itemStatus === "string" && item.itemStatus.length > 0,
    );
    TestValidator.predicate(
      "sellerShopName is non-empty string",
      typeof item.sellerShopName === "string" && item.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "createdAt is date-time string",
      typeof item.createdAt === "string" &&
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]+)?Z$/.test(
          item.createdAt,
        ),
    );
  }
}
