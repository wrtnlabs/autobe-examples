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
export async function test_api_seller_verification_document_update_rejection_flow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator to have permission to update verification documents
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a random sellerId and documentId since we can't create a seller with available functions
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const documentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update document status to 'rejected' with comments
  const rejectionComments = "Business license expired and not renewed";
  const updatedDocument =
    await api.functional.shoppingMall.admin.sellers.verification_documents.update(
      adminConnection,
      {
        sellerId,
        documentId,
        body: {
          status: "rejected",
          review_comments: rejectionComments,
          version: 1,
        } satisfies IShoppingMallSellerVerificationDocument.IUpdate,
      },
    );
  typia.assert(updatedDocument);
  // Step 4: Verify that document was updated with correct status and comments
  TestValidator.equals(
    "document status should be rejected",
    updatedDocument.status,
    "rejected",
  );
  TestValidator.equals(
    "review comments should be preserved",
    updatedDocument.admin_comments,
    rejectionComments,
  );
}
