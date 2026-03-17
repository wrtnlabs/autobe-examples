import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { generate_random_ecommerce_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test advanced filtering by requester type combined with date range filters.
 * Validates polymorphic filter capabilities for customer/seller requester types
 * and complex query logic with pagination.
 */
export async function test_api_admin_promotion_request_list_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin for querying requests
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  // Create super admin account first
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: "https://test.example.com/superadmin/join",
        referrer: "https://test.example.com/",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Record time before creating requests (for date range filtering)
  const beforeRequests = new Date();
  // 2. Create first customer and submit promotion request
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customer1Request =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customer1Connection,
      {
        body: { reason: "Customer 1 requesting admin privileges for testing" },
      },
    );
  typia.assert(customer1Request);
  // 3. Create second customer and submit promotion request
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const customer2Request =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customer2Connection,
      {
        body: { reason: "Customer 2 requesting admin privileges for testing" },
      },
    );
  typia.assert(customer2Request);
  // 4. Create seller and submit promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/seller/join",
      referrer: "https://test.example.com/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const sellerRequest =
    await generate_random_ecommerce_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      { body: { reason: "Seller requesting admin privileges for testing" } },
    );
  typia.assert(sellerRequest);
  // 5. Query with customer filter only
  const customerFilteredResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          requesterType: "customer",
          sort: "submittedAt:desc",
          limit: 5,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(customerFilteredResult);
  // Validate customer filter results
  TestValidator.equals(
    "customer filter returns 2 results",
    customerFilteredResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "customer filter data length",
    customerFilteredResult.data.length,
    2,
  );
  // Verify all returned requests are from customers (check that seller request is not included)
  const customerRequestIds = [customer1Request.id, customer2Request.id];
  for (const request of customerFilteredResult.data) {
    TestValidator.predicate(
      "request is from a customer",
      customerRequestIds.includes(request.id),
    );
  }
  // 6. Query with seller filter only
  const sellerFilteredResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          requesterType: "seller",
          sort: "submittedAt:desc",
          limit: 5,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerFilteredResult);
  // Validate seller filter results
  TestValidator.equals(
    "seller filter returns 1 result",
    sellerFilteredResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "seller filter data length",
    sellerFilteredResult.data.length,
    1,
  );
  TestValidator.equals(
    "seller request id matches",
    sellerFilteredResult.data[0].id,
    sellerRequest.id,
  );
  // 7. Query with date range filter (submittedAtFrom)
  const dateFilteredResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          submittedAtFrom: beforeRequests.toISOString(),
          sort: "submittedAt:desc",
          limit: 10,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(dateFilteredResult);
  // Should return all 3 requests since they were created after beforeRequests
  TestValidator.equals(
    "date filter returns all recent requests",
    dateFilteredResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "date filter data length",
    dateFilteredResult.data.length,
    3,
  );
  // 8. Query with combined filters (customer + date range)
  const combinedFilteredResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          requesterType: "customer",
          submittedAtFrom: beforeRequests.toISOString(),
          sort: "submittedAt:desc",
          limit: 5,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(combinedFilteredResult);
  // Validate combined filter results
  TestValidator.equals(
    "combined filter returns 2 customer results",
    combinedFilteredResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "combined filter data length",
    combinedFilteredResult.data.length,
    2,
  );
  // 9. Test pagination with small limit
  const paginatedResult: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          sort: "submittedAt:desc",
          limit: 2,
          page: 1,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination
  TestValidator.equals(
    "pagination total records",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination data length",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination total pages",
    paginatedResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  // 10. Verify sorting (newest first)
  if (paginatedResult.data.length >= 2) {
    const firstDate = new Date(paginatedResult.data[0].createdAt);
    const secondDate = new Date(paginatedResult.data[1].createdAt);
    TestValidator.predicate(
      "sorted by submittedAt desc",
      firstDate >= secondDate,
    );
  }
}
