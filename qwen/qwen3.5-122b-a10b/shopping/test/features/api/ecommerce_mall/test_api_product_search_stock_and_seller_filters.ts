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

export async function test_api_product_search_stock_and_seller_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Test search with in_stock=true filter
  const inStockSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        in_stock: true,
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(inStockSearch);
  // 3. Test search with seller_approval_status='approved' filter
  const approvedSellerSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        seller_approval_status: "approved",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(approvedSellerSearch);
  // Verify all returned products are from approved sellers
  for (const result of approvedSellerSearch.data) {
    if (result.type === "product") {
      TestValidator.equals(
        "seller approval status is approved",
        result.seller.approval_status,
        "approved",
      );
    }
  }
  // 4. Test search with seller_approval_status='pending' filter
  const pendingSellerSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        seller_approval_status: "pending",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(pendingSellerSearch);
  // Verify all returned products are from pending sellers
  for (const result of pendingSellerSearch.data) {
    if (result.type === "product") {
      TestValidator.equals(
        "seller approval status is pending",
        result.seller.approval_status,
        "pending",
      );
    }
  }
  // 5. Test search with seller_approval_status='rejected' filter
  const rejectedSellerSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        seller_approval_status: "rejected",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(rejectedSellerSearch);
  // Verify all returned products are from rejected sellers
  for (const result of rejectedSellerSearch.data) {
    if (result.type === "product") {
      TestValidator.equals(
        "seller approval status is rejected",
        result.seller.approval_status,
        "rejected",
      );
    }
  }
  // 6. Test sorting by price ascending
  const priceAscSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "price",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(priceAscSearch);
  // 7. Test sorting by price descending
  const priceDescSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "price",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(priceDescSearch);
  // 8. Test sorting by created_at ascending
  const createdAtAscSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "created_at",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(createdAtAscSearch);
  // 9. Test sorting by created_at descending
  const createdAtDescSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "created_at",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(createdAtDescSearch);
  // 10. Test sorting by relevance
  const relevanceSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "relevance",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(relevanceSearch);
  // 11. Test sorting by name
  const nameSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        sort_by: "name",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(nameSearch);
  // 12. Test combined filters: in_stock + seller_approval_status
  const combinedFilterSearch = await api.functional.ecommerceMall.search(
    customerConnection,
    {
      body: {
        query: "product",
        in_stock: true,
        seller_approval_status: "approved",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallSearch.IRequest,
    },
  );
  typia.assert(combinedFilterSearch);
  // Verify combined filter results
  for (const result of combinedFilterSearch.data) {
    if (result.type === "product") {
      TestValidator.equals(
        "seller approval status is approved in combined filter",
        result.seller.approval_status,
        "approved",
      );
    }
  }
}
