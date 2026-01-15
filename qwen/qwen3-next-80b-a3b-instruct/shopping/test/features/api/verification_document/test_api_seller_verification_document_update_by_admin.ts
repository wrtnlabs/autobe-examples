import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_verification_document_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using authorize_admin_join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 2: Use typia.random to generate a realistic verification document that exists
  // This simulates a document previously submitted by a seller and awaiting admin review
  // Per schema, document has seller_id, document_type, file_uri, uploaded_at, status = pending
  const existingDocument =
    typia.random<IShoppingMallSellerVerificationDocument>();
  // Ensure the document is in pending state as required by the scenario
  existingDocument.status = "pending";
  // Since we cannot control seller_id via random, ensure it's a valid UUID:
  existingDocument.seller_id = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Admin updates the verification document status from 'pending' to 'approved' with comments
  // For the first update, version should be 1 as per schema (starts at 1 for initial document)
  const updatedDocumentData: IShoppingMallSellerVerificationDocument.IUpdate = {
    status: "approved",
    review_comments:
      "Document verified and approved. All information matched official records.",
    version: 1, // Initialize version to 1 for the first update
  } satisfies IShoppingMallSellerVerificationDocument.IUpdate;
  const updatedDocument =
    await api.functional.shoppingMall.admin.sellers.verification_documents.update(
      adminConnection,
      {
        sellerId: existingDocument.seller_id,
        documentId: existingDocument.id,
        body: updatedDocumentData,
      },
    );
  typia.assert(updatedDocument);
  // Step 4: Validate the update was correctly processed
  TestValidator.equals(
    "status should be updated to approved",
    updatedDocument.status,
    "approved",
  );
  TestValidator.equals(
    "admin comments should be populated",
    updatedDocument.admin_comments,
    "Document verified and approved. All information matched official records.",
  );
}
