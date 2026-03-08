import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAnalytic";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_analytics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test date range filtering
  const startDate = new Date("2024-01-01T00:00:00Z").toISOString();
  const endDate = new Date("2024-03-31T23:59:59Z").toISOString();
  const dateFilteredResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // 3. Test seller-specific filtering
  const sellerFilteredResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          seller_id: customer.id,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(sellerFilteredResponse);
  // 4. Test combined filtering (date + seller)
  const combinedFilteredResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          seller_id: customer.id,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(combinedFilteredResponse);
  // 5. Test category filtering
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const categoryFilteredResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          category_id: categoryId,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(categoryFilteredResponse);
  // 6. Test product filtering
  const productId = typia.random<string & tags.Format<"uuid">>();
  const productFilteredResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          product_id: productId,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(productFilteredResponse);
  // 7. Test sorting by revenue descending
  const sortedResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          sort_field: "revenue",
          sort_order: "desc",
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(sortedResponse);
  TestValidator.equals("page number", sortedResponse.pagination.current, 1);
  TestValidator.predicate(
    "sort applied",
    sortedResponse.pagination.limit === 20,
  );
  // 8. Test pagination (page 2, limit 10)
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.analytics.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallAnalytic.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals("page number", paginatedResponse.pagination.current, 2);
  TestValidator.equals("limit", paginatedResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count <= limit",
    paginatedResponse.data.length <= paginatedResponse.pagination.limit,
  );
}