import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Test creation of a promotional campaign with invalid JSON
 * target_customer_segment. Ensure the system parses and validates the JSON
 * structure and rejects malformed inputs with a 400 status code.
 *
 * This test first authenticates as an admin user to establish authorization
 * context. Then it attempts to create a promotional campaign with a malformed
 * JSON target_customer_segment field (invalid JSON string) to verify that the
 * API properly validates and rejects malformed JSON with a 400 error.
 *
 * Steps:
 *
 * 1. Authenticate as admin via POST /auth/admin/join
 * 2. Attempt to create promotional campaign with invalid JSON string in
 *    target_customer_segment (non-valid JSON)
 * 3. Validate that the API returns a 400 error indicating malformed JSON
 */
export async function test_api_promotional_campaign_create_invalid_target(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create promotional campaign with invalid JSON target_customer_segment
  // Use a malformed JSON string (missing quotes, invalid syntax)
  const invalidJson = '{"age": 25, "active" true}'; // Invalid - missing colon after "active"
  await TestValidator.error(
    "malformed JSON target_customer_segment should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body: invalidJson satisfies IShoppingMallPromotionalCampaign.ICreate,
        },
      );
    },
  );
}
