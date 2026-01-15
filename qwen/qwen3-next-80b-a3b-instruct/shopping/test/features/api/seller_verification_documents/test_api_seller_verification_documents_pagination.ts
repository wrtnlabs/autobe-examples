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
export async function test_api_seller_verification_documents_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Validate pagination structure with empty dataset first
  const emptyPagination = {
    current: 0,
    limit: 10,
    records: 0,
    pages: 0,
  } satisfies IPage.IPagination;
  const emptyResult =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: admin.id,
        body: {
          pagination: emptyPagination,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate that empty response matches expected structure
  TestValidator.equals(
    "pagination structure for empty data",
    emptyResult.pagination,
    emptyPagination,
  );
  TestValidator.equals("no documents returned", emptyResult.data.length, 0);
  // Now test a more realistic pagination scenario
  // Since we can't create documents and may have some existing ones,
  // test the pagination mechanism with the current system state
  const standardPagination = {
    current: 0,
    limit: 5,
    records: 15,
    pages: 3,
  } satisfies IPage.IPagination;
  const result =
    await api.functional.shoppingMall.admin.sellers.verification_documents.index(
      adminConnection,
      {
        sellerId: admin.id,
        body: {
          pagination: standardPagination,
        } satisfies IShoppingMallSellerVerificationDocument.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination structure regardless of actual documents
  TestValidator.equals(
    "pagination structure",
    result.pagination.current,
    standardPagination.current,
  );
  TestValidator.equals(
    "pagination limit",
    result.pagination.limit,
    standardPagination.limit,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    result.pagination.records >= 0,
  );
  // Validate that the data array follows the correct type
  if (result.data.length > 0) {
    TestValidator.equals(
      "first document has id",
      "string",
      typeof result.data[0].id,
    );
    TestValidator.equals(
      "first document has document_type",
      "string",
      typeof result.data[0].document_type,
    );
    TestValidator.equals(
      "first document has status",
      "string",
      typeof result.data[0].status,
    );
    TestValidator.equals(
      "first document has submission_date",
      "string",
      typeof result.data[0].submission_date,
    );
    TestValidator.equals(
      "first document has expiry_date",
      "string",
      typeof result.data[0].expiry_date,
    );
    TestValidator.equals(
      "first document has document_version",
      "number",
      typeof result.data[0].document_version,
    );
  }
}
