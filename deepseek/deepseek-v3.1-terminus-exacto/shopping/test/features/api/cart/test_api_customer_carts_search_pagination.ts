import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_carts_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Test pagination with different page sizes
  const pageSizes: readonly number[] = [5, 10, 15];
  for (const pageSize of pageSizes) {
    // Test first page with customer ID filter
    const firstPage = await api.functional.ecommerce.customer.carts.index(
      customerConnection,
      {
        body: {
          customer_id: customerAuth.id,
          page: 1,
          limit: pageSize,
        } satisfies IEcommerceShoppingCart.IRequest,
      },
    );
    typia.assert(firstPage);
    // Validate pagination metadata
    TestValidator.equals(
      `page ${pageSize}: current page`,
      firstPage.pagination.current,
      1,
    );
    TestValidator.equals(
      `page ${pageSize}: limit`,
      firstPage.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page ${pageSize}: records non-negative`,
      firstPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${pageSize}: pages non-negative`,
      firstPage.pagination.pages >= 0,
    );
    // Validate pagination calculation: pages = ceil(records / limit)
    const expectedPages = Math.ceil(firstPage.pagination.records / pageSize);
    TestValidator.equals(
      `page ${pageSize}: pages calculation`,
      firstPage.pagination.pages,
      expectedPages,
    );
    // Test page beyond available data
    if (firstPage.pagination.pages > 0) {
      const lastPage = await api.functional.ecommerce.customer.carts.index(
        customerConnection,
        {
          body: {
            customer_id: customerAuth.id,
            page: firstPage.pagination.pages,
            limit: pageSize,
          } satisfies IEcommerceShoppingCart.IRequest,
        },
      );
      typia.assert(lastPage);
      TestValidator.equals(
        `page ${pageSize} last page: current`,
        lastPage.pagination.current,
        firstPage.pagination.pages,
      );
      TestValidator.equals(
        `page ${pageSize} last page: total records`,
        lastPage.pagination.records,
        firstPage.pagination.records,
      );
    }
    // Test requesting page beyond maximum
    const invalidPage = await api.functional.ecommerce.customer.carts.index(
      customerConnection,
      {
        body: {
          customer_id: customerAuth.id,
          page: firstPage.pagination.pages + 10,
          limit: pageSize,
        } satisfies IEcommerceShoppingCart.IRequest,
      },
    );
    typia.assert(invalidPage);
    // Should return empty array for invalid page
    TestValidator.equals(
      `page ${pageSize} invalid: empty data`,
      invalidPage.data.length,
      0,
    );
    TestValidator.equals(
      `page ${pageSize} invalid: total records consistent`,
      invalidPage.pagination.records,
      firstPage.pagination.records,
    );
  }
  // Test edge case: page size 1
  const singlePage = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        customer_id: customerAuth.id,
        page: 1,
        limit: 1,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(singlePage);
  TestValidator.equals(`single page: limit 1`, singlePage.pagination.limit, 1);
  TestValidator.predicate(
    `single page: data size <= 1`,
    singlePage.data.length <= 1,
  );
  // Validate pagination calculation for single page
  if (singlePage.pagination.records > 0) {
    TestValidator.equals(
      `single page: pages calculation`,
      singlePage.pagination.pages,
      singlePage.pagination.records,
    );
  }
  // Test edge case: maximum page size
  const maxPageSize = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        customer_id: customerAuth.id,
        page: 1,
        limit: 100,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(maxPageSize);
  TestValidator.equals(
    `max page size: limit 100`,
    maxPageSize.pagination.limit,
    100,
  );
  TestValidator.predicate(
    `max page size: data size <= 100`,
    maxPageSize.data.length <= 100,
  );
  // Test empty result set with non-existent customer ID
  const emptySearch = await api.functional.ecommerce.customer.carts.index(
    customerConnection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 10,
      } satisfies IEcommerceShoppingCart.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    `empty search: zero records`,
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    `empty search: zero pages`,
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    `empty search: empty data array`,
    emptySearch.data.length,
    0,
  );
}
