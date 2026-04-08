import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_product_overview_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test filter by category_id with random UUID
  const categoryFiltered =
    await api.functional.ecommerce.admin.products.overview(adminConnection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(categoryFiltered);
  TestValidator.predicate(
    "category filter returns paginated response",
    categoryFiltered.data !== undefined,
  );
  TestValidator.predicate(
    "pagination metadata present",
    categoryFiltered.pagination !== undefined,
  );
  // 3. Test filter by price range
  const priceFiltered = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {
        min_price: 10000,
        max_price: 50000,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(priceFiltered);
  TestValidator.predicate(
    "price filter returns paginated response",
    priceFiltered.data !== undefined,
  );
  TestValidator.predicate(
    "price filter pagination valid",
    priceFiltered.pagination.records >= 0,
  );
  // 4. Test filter by in_stock_only
  const stockFiltered = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {
        in_stock_only: true,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(stockFiltered);
  TestValidator.predicate(
    "stock filter returns paginated response",
    stockFiltered.data !== undefined,
  );
  TestValidator.predicate(
    "stock filter pagination valid",
    stockFiltered.pagination.records >= 0,
  );
  // 5. Test combined filters (category + price range + stock)
  const combinedFiltered =
    await api.functional.ecommerce.admin.products.overview(adminConnection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        min_price: 20000,
        max_price: 60000,
        in_stock_only: true,
      } satisfies IEcommerceProduct.IRequest,
    });
  typia.assert(combinedFiltered);
  TestValidator.predicate(
    "combined filter returns paginated response",
    combinedFiltered.data !== undefined,
  );
  TestValidator.predicate(
    "combined filter pagination current",
    combinedFiltered.pagination.current >= 0,
  );
  TestValidator.predicate(
    "combined filter pagination limit",
    combinedFiltered.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "combined filter pagination records",
    combinedFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "combined filter pagination pages",
    combinedFiltered.pagination.pages >= 0,
  );
  // 6. Test filter with sort parameters
  const sortedFiltered = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {
        sort_by: "base_price",
        sort_order: "asc",
        limit: 10,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(sortedFiltered);
  TestValidator.predicate(
    "sort filter returns paginated response",
    sortedFiltered.data !== undefined,
  );
  TestValidator.predicate(
    "sort filter respects limit",
    sortedFiltered.data.length <= 10,
  );
  // 7. Test pagination with page parameter
  const pageFiltered = await api.functional.ecommerce.admin.products.overview(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IEcommerceProduct.IRequest,
    },
  );
  typia.assert(pageFiltered);
  TestValidator.equals(
    "page filter current page",
    pageFiltered.pagination.current,
    1,
  );
  TestValidator.equals("page filter limit", pageFiltered.pagination.limit, 5);
}
