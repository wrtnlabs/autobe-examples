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
export async function test_api_seller_verification_documents_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a unique sellerId for testing (since we cannot create seller documents)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve verification documents with pagination and sorting
  const retrievalBody: IShoppingMallSellerVerificationDocument.IRequest = {
    sortBy: "created_at",
    sortOrder: "desc",
    pagination: {
      current: 0,
      limit: 10,
      records: 0,
      pages: 0,
    },
  } satisfies IShoppingMallSellerVerificationDocument.IRequest;
  const result =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: retrievalBody,
      },
    );
  typia.assert(result);
  // Step 4: Validate response structure matches IPageIShoppingMallSellerVerificationDocument.ISummary
  // Validate pagination structure
  TestValidator.equals(
    "pagination current is number",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof result.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof result.pagination.pages,
    "number",
  );
  // Validate pagination values are non-negative
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Validate each document has the structure of IShoppingMallSellerVerificationDocument.ISummary
  for (const doc of result.data) {
    TestValidator.equals("document id is string", typeof doc.id, "string");
    TestValidator.equals(
      "document document_type is string",
      typeof doc.document_type,
      "string",
    );
    TestValidator.equals(
      "document status is string",
      typeof doc.status,
      "string",
    );
    TestValidator.equals(
      "document submission_date is string",
      typeof doc.submission_date,
      "string",
    );
    TestValidator.equals(
      "document expiry_date is string",
      typeof doc.expiry_date,
      "string",
    );
    TestValidator.equals(
      "document document_version is number",
      typeof doc.document_version,
      "number",
    );
    // Validate document_version is positive
    TestValidator.predicate(
      "document_version is positive integer",
      doc.document_version >= 1,
    );
    // Validate date format
    TestValidator.predicate(
      "submission_date is valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(doc.submission_date),
    );
    TestValidator.predicate(
      "expiry_date is valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(doc.expiry_date),
    );
  }
  // Step 5: Test with different sort order
  const ascendingFilter: IShoppingMallSellerVerificationDocument.IRequest = {
    sortBy: "created_at",
    sortOrder: "asc",
    pagination: {
      current: 0,
      limit: 10,
      records: 0,
      pages: 0,
    },
  } satisfies IShoppingMallSellerVerificationDocument.IRequest;
  const ascendingResult =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: ascendingFilter,
      },
    );
  typia.assert(ascendingResult);
  // Step 6: Validate we get the same structure
  TestValidator.equals(
    "ascending result pagination current",
    ascendingResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "ascending result pagination limit",
    ascendingResult.pagination.limit,
    10,
  );
  // Validate data structure is consistent
  for (const doc of ascendingResult.data) {
    TestValidator.equals(
      "ascending document id is string",
      typeof doc.id,
      "string",
    );
    TestValidator.equals(
      "ascending document document_type is string",
      typeof doc.document_type,
      "string",
    );
    TestValidator.equals(
      "ascending document status is string",
      typeof doc.status,
      "string",
    );
    TestValidator.equals(
      "ascending document submission_date is string",
      typeof doc.submission_date,
      "string",
    );
    TestValidator.equals(
      "ascending document expiry_date is string",
      typeof doc.expiry_date,
      "string",
    );
    TestValidator.equals(
      "ascending document document_version is number",
      typeof doc.document_version,
      "number",
    );
    TestValidator.predicate(
      "ascending document_version is positive integer",
      doc.document_version >= 1,
    );
    // Validate date format
    TestValidator.predicate(
      "ascending submission_date is valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(doc.submission_date),
    );
    TestValidator.predicate(
      "ascending expiry_date is valid ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(doc.expiry_date),
    );
  }
  // Step 7: Test with status filter
  const filteredBody: IShoppingMallSellerVerificationDocument.IRequest = {
    status: "approved",
    pagination: {
      current: 0,
      limit: 5,
      records: 0,
      pages: 0,
    },
  } satisfies IShoppingMallSellerVerificationDocument.IRequest;
  const filteredResult =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: filteredBody,
      },
    );
  typia.assert(filteredResult);
  // Validate structure is consistent with filtered response
  TestValidator.equals(
    "filtered result pagination current",
    filteredResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "filtered result pagination limit",
    filteredResult.pagination.limit,
    5,
  );
  // Validate each document has the filtered status
  for (const doc of filteredResult.data) {
    TestValidator.equals(
      "filtered document status matches query",
      doc.status,
      "approved",
    );
  }
  // Step 8: Test with empty status filter
  const emptyStatusBody: IShoppingMallSellerVerificationDocument.IRequest = {
    status: undefined,
    pagination: {
      current: 0,
      limit: 10,
      records: 0,
      pages: 0,
    },
  } satisfies IShoppingMallSellerVerificationDocument.IRequest;
  const emptyStatusResult =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: sellerId,
        body: emptyStatusBody,
      },
    );
  typia.assert(emptyStatusResult);
  // Validate structure is consistent but not filtered by status
  TestValidator.equals(
    "empty status pagination current",
    emptyStatusResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "empty status pagination limit",
    emptyStatusResult.pagination.limit,
    10,
  );
  // All possible status values are allowed in empty result
  // We don't validate specific statuses since we expect empty result or mixed results
  // Step 9: Test with non-existent sellerId - expect empty result
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: nonExistentSellerId,
        body: {
          pagination: {
            current: 0,
            limit: 10,
            records: 0,
            pages: 0,
          },
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate empty result structure
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    0,
  );
  TestValidator.equals(
    "empty result pagination limit",
    emptyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
}