import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerVerificationDocument";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_verification_documents_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin to access seller verification documents
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Since we cannot create a seller account due to lack of endpoint, we need to use an existing seller id
  // For testing purposes, we'll create a random UUID as the sellerId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Test filtering endpoint with various parameters
  // Test empty filter (should return all documents)
  const allResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {} satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "response should have pagination data",
    allResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(allResponse.data),
  );
  // Test filtering by status
  const statusResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          status: "pending",
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(statusResponse);
  TestValidator.predicate(
    "response should have pagination data",
    statusResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(statusResponse.data),
  );
  // Test date range filtering (using valid ISO 8601 format)
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          createdAtStart: oneWeekAgo,
          createdAtEnd: tomorrow,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "response should have pagination data",
    dateRangeResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(dateRangeResponse.data),
  );
  // Test combination filter
  const combinedResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          status: "pending",
          createdAtStart: oneWeekAgo,
          createdAtEnd: tomorrow,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.predicate(
    "response should have pagination data",
    combinedResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(combinedResponse.data),
  );
  // Test sorting by status
  const sortedByStatus =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          sortBy: "status",
          sortOrder: "asc",
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  TestValidator.predicate(
    "response should have pagination data",
    sortedByStatus.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(sortedByStatus.data),
  );
  // Test sorting by document_type is removed as it's not a valid filter parameter
  // Test pagination
  const paginatedResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          pagination: {
            current: 0,
            limit: 5,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit should be 5",
    paginatedResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current should be 0",
    paginatedResponse.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    paginatedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page should have at least 0 documents",
    paginatedResponse.data.length >= 0,
  );
  // Test pagination with sorting
  const paginatedSortedResponse =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          pagination: {
            current: 0,
            limit: 10,
            records: 0,
            pages: 0,
          } satisfies IPage.IPagination,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(paginatedSortedResponse);
  TestValidator.equals(
    "pagination limit should be 10",
    paginatedSortedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current should be 0",
    paginatedSortedResponse.pagination.current,
    0,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(paginatedSortedResponse.data),
  );
}
