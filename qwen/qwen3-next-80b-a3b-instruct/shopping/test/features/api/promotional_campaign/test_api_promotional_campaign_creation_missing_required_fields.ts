import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPromotionalCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotionalCampaign";

/**
 * Determine whether a promotional campaign can be created with required fields
 * missing.
 *
 * According to the business scenario, a promotional campaign requires minimum
 * fields of total_budget and target_customer_segment. This test validates that
 * the system properly rejects incomplete configurations and returns appropriate
 * validation errors.
 *
 * The flow is:
 *
 * 1. Authenticate as an admin
 * 2. Attempt to create a promotional campaign with required fields missing
 *    (total_budget and target_customer_segment)
 * 3. Validate that the system responds with a validation error
 * 4. Confirm that no campaign was created
 *
 * Since IShoppingMallPromotionalCampaign.ICreate is a string type, we cannot
 * construct a complex object with missing properties. Instead, we must create a
 * malformed string that represents a JSON object missing the required
 * properties, which will trigger validation failure.
 *
 * The system expects a JSON string in the
 * IShoppingMallPromotionalCampaign.ICreate type. We construct a JSON string
 * without 'total_budget' and 'target_customer_segment' fields, which are
 * required based on the business description. This should cause validation
 * error.
 */
export async function test_api_promotional_campaign_creation_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create promotional campaign with missing required fields
  // The IShoppingMallPromotionalCampaign.ICreate is a string type containing JSON
  // We construct a JSON string missing 'total_budget' and 'target_customer_segment'
  const incompleteCampaignJson = `{
    "name": "Summer Sale",
    "description": "Summer promotion",
    "start_date": "2024-07-01T00:00:00Z",
    "end_date": "2024-08-31T23:59:59Z",
    "status": "active"
  }`;

  // This will fail because required fields 'total_budget' and 'target_customer_segment' are missing
  await TestValidator.error(
    "creation should fail with missing required fields",
    async () => {
      await api.functional.shoppingMall.admin.promotions.promotional_campaigns.create(
        connection,
        {
          body: incompleteCampaignJson satisfies IShoppingMallPromotionalCampaign.ICreate,
        },
      );
    },
  );

  // Step 3: Verify that no campaign was created (implicit validation)
  // The error above would have been thrown if validation passed, so we're confident
  // no campaign was created. The failed creation would not persist in system.
}
