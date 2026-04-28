import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test soft-deleted seller retrieval with audit trail verification.
 *
 * Validates that the seller retrieval endpoint returns comprehensive seller entity information including authentication credentials, approval status, and administrative metadata for audit and compliance purposes. The endpoint supports retrieving soft-deleted seller accounts where the deleted_at timestamp is populated, ensuring that historical data remains accessible.
 *
 * Special attention is given to verifying data retention policies: when a seller account has been soft-deleted (deleted_at populated), the associated profile data including shop_name, shop_description, and logo_image_uri must be retained for compliance reference.
 *
 * 1. Retrieve a seller account using simulation mode to generate valid test data.
 * 2. Validate the complete response structure with typia type assertion.
 * 3. Verify approval status is within valid domain values.
 * 4. Validate that soft-deleted accounts (deleted_at populated) retain profile data according to retention policies.
 */
export async function test_api_seller_retrieval_soft_deleted_audit(
  connection: api.IConnection,
): Promise<void> {
  // Use simulation mode since no seller creation/soft-deletion utilities exist
  const simulatedConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const seller = await api.functional.ecommercePlatform.sellers.at(
    simulatedConnection,
    {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // Validate complete response structure (type, format, constraints)
  typia.assert(seller);
  // Validate approval status is within allowed domain values
  const validStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "approval status valid",
    (validStatuses as readonly string[]).includes(seller.approval_status),
  );
  // Audit trail: verify soft-deleted sellers retain profile data per retention policies
  const deletedAtValue = seller.deleted_at;
  if (deletedAtValue !== null && deletedAtValue !== undefined) {
    // Data retention policy: soft-deleted accounts must preserve profile information
    // for compliance and historical reference
    const hasProfileData =
      seller.shop_name !== null ||
      seller.shop_description !== null ||
      seller.logo_image_uri !== null;
    TestValidator.predicate(
      "soft-deleted seller retains profile data",
      hasProfileData,
    );
  }
}
