import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
export async function test_api_seller_verification_document_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random seller ID and document ID with proper UUID format
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const documentId = typia.random<string & tags.Format<"uuid">>();
  // Create a sample verification document using typia.random
  const expectedDocument =
    typia.random<IShoppingMallSellerVerificationDocument>();
  // Call the API endpoint to retrieve the document
  const retrievedDocument: IShoppingMallSellerVerificationDocument =
    await api.functional.shoppingMall.sellers.verification_documents.at(
      connection,
      {
        sellerId,
        documentId,
      },
    );
  // Validate response type and structure - THIS IS SUFFICIENT FOR TYPE SAFETY
  typia.assert(retrievedDocument);
  // Verify that the returned document matches the expected identifiers
  TestValidator.equals("document ID matches", retrievedDocument.id, documentId);
  TestValidator.equals(
    "seller ID matches",
    retrievedDocument.seller_id,
    sellerId,
  );
}
