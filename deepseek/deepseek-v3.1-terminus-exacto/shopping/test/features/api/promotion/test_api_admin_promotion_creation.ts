import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Comprehensive E2E test for shopping mall promotion creation workflow.
 *
 * This test validates that administrators can create various types of marketing
 * promotions with proper scheduling, targeting, and discount structures. The
 * workflow includes administrator authentication, channel creation for targeted
 * promotions, and multiple promotion type validations.
 */
export async function test_api_admin_promotion_creation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        first_name: RandomGenerator.paragraph({ sentences: 2 }),
        last_name: RandomGenerator.paragraph({ sentences: 2 }),
        role: "super_admin",
        permissions: JSON.stringify({
          promotions: ["create", "read", "update", "delete"],
          channels: ["create", "read"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a channel for targeted promotions
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        configuration: "targetAudience=premium_customers;discountLimit=20",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create sale promotion
  const salePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `Sale_Promotion_${RandomGenerator.alphaNumeric(6)}`,
        description: "Special sale promotion for loyal customers",
        promotion_type: "sale",
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
        is_active: true,
        priority: 50,
        channel_id: channel.id,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(salePromotion);
  TestValidator.equals(
    "sale promotion name contains expected prefix",
    salePromotion.name.includes("Sale_Promotion"),
    true,
  );

  // Step 4: Create clearance promotion
  const clearancePromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `Clearance_Promotion_${RandomGenerator.alphaNumeric(6)}`,
        description: "Clearance promotion for inventory reduction",
        promotion_type: "clearance",
        start_date: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
        end_date: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        is_active: false, // Inactive initially
        priority: 75,
        channel_id: channel.id,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(clearancePromotion);
  TestValidator.equals(
    "clearance promotion name contains expected prefix",
    clearancePromotion.name.includes("Clearance_Promotion"),
    true,
  );

  // Step 5: Create seasonal promotion
  const seasonalPromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: `Seasonal_Promotion_${RandomGenerator.alphaNumeric(6)}`,
        description: "Seasonal promotion for holiday shopping",
        promotion_type: "seasonal",
        start_date: new Date().toISOString(), // Starts immediately
        end_date: new Date(Date.now() + 2592000000).toISOString(), // 30 days from now
        is_active: true,
        priority: 25,
        channel_id: channel.id,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(seasonalPromotion);
  TestValidator.equals(
    "seasonal promotion name contains expected prefix",
    seasonalPromotion.name.includes("Seasonal_Promotion"),
    true,
  );

  // Step 6: Validate promotion scheduling constraints
  TestValidator.predicate(
    "sale promotion start date before end date",
    new Date(salePromotion.start_date) < new Date(salePromotion.end_date),
  );
  TestValidator.predicate(
    "clearance promotion start date before end date",
    new Date(clearancePromotion.start_date) <
      new Date(clearancePromotion.end_date),
  );
  TestValidator.predicate(
    "seasonal promotion start date before end date",
    new Date(seasonalPromotion.start_date) <
      new Date(seasonalPromotion.end_date),
  );

  // Step 7: Validate creator identity tracking
  TestValidator.equals(
    "seasonal promotion creator ID matches authenticated admin",
    seasonalPromotion.creator.id,
    admin.administrator.id,
  );
  TestValidator.equals(
    "seasonal promotion creator email matches authenticated admin",
    seasonalPromotion.creator.email,
    admin.administrator.email,
  );

  // Step 8: Validate channel association
  TestValidator.equals(
    "sale promotion channel association correct",
    salePromotion.channel?.id,
    channel.id,
  );
  TestValidator.equals(
    "clearance promotion channel association correct",
    clearancePromotion.channel?.id,
    channel.id,
  );
  TestValidator.equals(
    "seasonal promotion channel association correct",
    seasonalPromotion.channel?.id,
    channel.id,
  );

  // Step 9: Validate promotion uniqueness
  TestValidator.notEquals(
    "sale and clearance promotion names are unique",
    salePromotion.name,
    clearancePromotion.name,
  );
  TestValidator.notEquals(
    "sale and seasonal promotion names are unique",
    salePromotion.name,
    seasonalPromotion.name,
  );
  TestValidator.notEquals(
    "clearance and seasonal promotion names are unique",
    clearancePromotion.name,
    seasonalPromotion.name,
  );

  // Step 10: Validate promotion properties
  TestValidator.equals(
    "sale promotion is active",
    salePromotion.is_active,
    true,
  );
  TestValidator.equals(
    "clearance promotion is inactive",
    clearancePromotion.is_active,
    false,
  );
  TestValidator.equals(
    "seasonal promotion is active",
    seasonalPromotion.is_active,
    true,
  );
  TestValidator.predicate(
    "sale promotion priority is valid",
    salePromotion.priority >= 1 && salePromotion.priority <= 100,
  );
  TestValidator.predicate(
    "clearance promotion priority is valid",
    clearancePromotion.priority >= 1 && clearancePromotion.priority <= 100,
  );
  TestValidator.predicate(
    "seasonal promotion priority is valid",
    seasonalPromotion.priority >= 1 && seasonalPromotion.priority <= 100,
  );
}
