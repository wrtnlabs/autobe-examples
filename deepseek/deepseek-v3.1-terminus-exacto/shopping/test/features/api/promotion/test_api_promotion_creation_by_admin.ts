import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test successful creation of new promotion campaign by authenticated
 * administrator.
 *
 * This test validates the complete workflow of promotion creation:
 *
 * 1. Administrator account creation and authentication
 * 2. Promotion data generation with realistic business values
 * 3. API call to create promotion with proper scheduling and priority
 * 4. Validation of response data including automatic creator information capture
 * 5. Business rule verification (start date before end date, valid priority
 *    levels)
 */
export async function test_api_promotion_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ can_create_promotions: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate realistic promotion data
  const promotionTypes = [
    "sale",
    "clearance",
    "loyalty",
    "seasonal",
    "special_offer",
  ] as const;
  const selectedType = RandomGenerator.pick(promotionTypes);

  const promotionData = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    promotion_type: selectedType,
    start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    end_date: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
    is_active: true,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IShoppingMallPromotion.ICreate;

  // Step 3: Create the promotion
  const createdPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: promotionData,
    });
  typia.assert(createdPromotion);

  // Step 4: Validate the response data matches input
  TestValidator.equals(
    "promotion name should match input",
    createdPromotion.name,
    promotionData.name,
  );
  TestValidator.equals(
    "promotion description should match input",
    createdPromotion.description,
    promotionData.description,
  );
  TestValidator.equals(
    "promotion type should match input",
    createdPromotion.promotion_type,
    promotionData.promotion_type,
  );
  TestValidator.equals(
    "promotion start date should match input",
    createdPromotion.start_date,
    promotionData.start_date,
  );
  TestValidator.equals(
    "promotion end date should match input",
    createdPromotion.end_date,
    promotionData.end_date,
  );
  TestValidator.equals(
    "promotion active status should match input",
    createdPromotion.is_active,
    promotionData.is_active,
  );
  TestValidator.equals(
    "promotion priority should match input",
    createdPromotion.priority,
    promotionData.priority,
  );

  // Validate automatic fields are set
  TestValidator.predicate(
    "created_at timestamp should be set",
    createdPromotion.created_at !== undefined &&
      createdPromotion.created_at !== null,
  );

  TestValidator.predicate(
    "updated_at timestamp should be set",
    createdPromotion.updated_at !== undefined &&
      createdPromotion.updated_at !== null,
  );

  // Validate creator information is automatically captured from authentication context
  TestValidator.equals(
    "creator should be the authenticated administrator",
    createdPromotion.creator.id,
    admin.administrator.id,
  );
  TestValidator.equals(
    "creator email should match",
    createdPromotion.creator.email,
    admin.administrator.email,
  );
  TestValidator.equals(
    "creator role should match",
    createdPromotion.creator.role,
    admin.administrator.role,
  );
}
