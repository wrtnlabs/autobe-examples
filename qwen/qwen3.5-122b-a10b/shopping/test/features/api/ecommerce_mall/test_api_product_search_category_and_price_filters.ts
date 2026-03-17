import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearch";
import type { IEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchResult";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSearchResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSearchResult";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_category_and_price_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Search with no filters (baseline)
  const baselineSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: RandomGenerator.alphabets(5),
        category_id: null,
        min_price: null,
        max_price: null,
        in_stock: null,
        seller_approval_status: null,
        sort_by: undefined,
        sort_order: undefined,
        page: undefined,
        limit: undefined,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(baselineSearch);
  // 3. Search with price range filter only
  const priceSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: RandomGenerator.alphabets(5),
        category_id: null,
        min_price: 0,
        max_price: 1000000,
        in_stock: null,
        seller_approval_status: null,
        sort_by: undefined,
        sort_order: undefined,
        page: undefined,
        limit: undefined,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(priceSearch);
  // 4. Search with combined category and price filters
  const combinedSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: RandomGenerator.alphabets(5),
        category_id: null,
        min_price: 1000,
        max_price: 50000,
        in_stock: null,
        seller_approval_status: null,
        sort_by: undefined,
        sort_order: undefined,
        page: undefined,
        limit: undefined,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(combinedSearch);
  // 5. Validate pagination structure
  TestValidator.equals(
    "pagination current exists",
    baselineSearch.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit exists",
    baselineSearch.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "pagination records exists",
    baselineSearch.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages exists",
    baselineSearch.pagination.pages >= 0,
    true,
  );
  // 6. Validate search results structure
  if (baselineSearch.data.length > 0) {
    const firstResult = baselineSearch.data[0];
    typia.assert(firstResult);
    // Validate product type result
    if (firstResult.type === "product") {
      TestValidator.predicate("product has name", firstResult.name.length > 0);
      TestValidator.predicate(
        "product has thumbnail",
        firstResult.thumbnailUrl.length > 0,
      );
      TestValidator.predicate(
        "product has base price",
        firstResult.basePrice >= 0,
      );
      TestValidator.predicate(
        "product has seller",
        firstResult.seller.id.length > 0,
      );
      TestValidator.predicate(
        "product has category",
        firstResult.category.id.length > 0,
      );
    }
    // Validate category type result
    else if (firstResult.type === "category") {
      TestValidator.predicate("category has name", firstResult.name.length > 0);
      TestValidator.predicate(
        "category has product count",
        firstResult.productCount >= 0,
      );
    }
    // Validate seller type result
    else if (firstResult.type === "seller") {
      TestValidator.predicate(
        "seller has shop name",
        firstResult.shopName.length > 0,
      );
      TestValidator.predicate(
        "seller has approval status",
        ["pending", "approved", "rejected"].includes(
          firstResult.approvalStatus,
        ),
      );
    }
  }
}
