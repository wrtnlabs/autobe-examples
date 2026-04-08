import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { generate_random_shopping_mall_seller_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_seller_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test filtering and sorting capabilities of the promotion requests list endpoint.
 *
 * Validates the complete filtering, search, and sorting functionality of the administrator promotion requests index endpoint. Ensures that requests can be filtered by status (pending, approved, rejected), actor type (customer, seller), and searched by reason text. Also verifies sorting by creation date in both ascending and descending order.
 *
 * The test creates multiple promotion requests from different actor types and validates that the filtering and sorting parameters work correctly in isolation and combination. Pagination functionality is also verified to ensure proper data retrieval.
 *
 * 1. Super administrator registers and authenticates to access the promotion requests endpoint.
 * 2. Customer registers, authenticates, and submits a promotion request with specific reason text.
 * 3. Seller registers, authenticates, and submits a promotion request with different reason text.
 * 4. Super administrator filters requests by status='pending' and verifies both requests appear.
 * 5. Super administrator filters by actor_type='customer' and verifies only customer request appears.
 * 6. Super administrator filters by actor_type='seller' and verifies only seller request appears.
 * 7. Super administrator applies combined filters (status='pending' AND actor_type='customer') and validates result.
 * 8. Super administrator searches for 'seller' keyword and verifies matching request is returned.
 * 9. Super administrator tests sorting by created_at in ascending and descending order.
 * 10. Pagination parameters are validated to ensure correct page navigation.
 */
export async function test_api_administrator_promotion_request_filter_by_status_and_actor(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "Admin1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com/home",
    },
  });
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer1234",
      href: "https://test.com/customer/join",
      referrer: "https://test.com/home",
    },
  });
  // 3. Customer submits promotion request
  const customerRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: "I want to help manage the platform",
        },
      },
    );
  typia.assert(customerRequest);
  // 4. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "Seller1234",
      href: "https://test.com/seller/join",
      referrer: "https://test.com/home",
    },
  });
  // 5. Seller submits promotion request
  const sellerRequest =
    await generate_random_shopping_mall_seller_administrator_requests_create(
      sellerConnection,
      {
        body: {
          reason: "Experienced seller seeking admin role",
        },
      },
    );
  typia.assert(sellerRequest);
  // 6. Test filtering by status='pending'
  const pendingFilterResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns both requests",
    pendingFilterResult.data.length,
    2,
  );
  TestValidator.predicate(
    "both requests are pending",
    pendingFilterResult.data.every((req) => req.status === "pending"),
  );
  // 7. Test filtering by actor_type='customer'
  const customerFilterResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          actor_type: "customer",
        },
      },
    );
  typia.assert(customerFilterResult);
  TestValidator.equals(
    "customer filter returns only customer request",
    customerFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "customer filter returns correct request",
    customerFilterResult.data[0].id,
    customerRequest.id,
  );
  // 8. Test filtering by actor_type='seller'
  const sellerFilterResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          actor_type: "seller",
        },
      },
    );
  typia.assert(sellerFilterResult);
  TestValidator.equals(
    "seller filter returns only seller request",
    sellerFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "seller filter returns correct request",
    sellerFilterResult.data[0].id,
    sellerRequest.id,
  );
  // 9. Test combined filters: status='pending' AND actor_type='customer'
  const combinedFilterResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          actor_type: "customer",
        },
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns only pending customer request",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter returns correct request",
    combinedFilterResult.data[0].id,
    customerRequest.id,
  );
  // 10. Test search functionality with 'seller' keyword
  const searchResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          search: "seller",
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns requests containing 'seller'",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain 'seller' in reason",
    searchResult.data.every((req) =>
      req.reason.toLowerCase().includes("seller"),
    ),
  );
  // 11. Test sorting by created_at ascending
  const ascSortResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "asc",
        },
      },
    );
  typia.assert(ascSortResult);
  TestValidator.predicate(
    "ascending sort returns oldest first",
    ascSortResult.data.length <= 1 ||
      new Date(ascSortResult.data[0].created_at).getTime() <=
        new Date(
          ascSortResult.data[ascSortResult.data.length - 1].created_at,
        ).getTime(),
  );
  // 12. Test sorting by created_at descending (default)
  const descSortResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(descSortResult);
  TestValidator.predicate(
    "descending sort returns newest first",
    descSortResult.data.length <= 1 ||
      new Date(descSortResult.data[0].created_at).getTime() >=
        new Date(
          descSortResult.data[descSortResult.data.length - 1].created_at,
        ).getTime(),
  );
  // 13. Test pagination with limit and page parameters
  const paginationResult =
    await api.functional.shoppingMall.administrator.promotion_requests.index(
      adminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct limit",
    paginationResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination shows correct total records",
    paginationResult.pagination.records >= 2,
  );
}
