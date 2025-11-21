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
 * Test promotion creation with specific channel targeting.
 *
 * Validates that promotions can be associated with specific shopping channels
 * for targeted marketing campaigns. Ensures proper channel reference validation
 * and association functionality for channel-specific promotions.
 *
 * This test follows the complete workflow:
 *
 * 1. Create administrator account for authentication context
 * 2. Create shopping channel for promotion association
 * 3. Create promotion targeting the specific channel
 * 4. Validate promotion-channel association and promotion properties
 */
export async function test_api_promotion_creation_with_channel_association(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({
          promotions: ["create", "read", "update"],
          channels: ["read"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // Step 2: Create shopping channel for promotion association
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: `channel_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        status: "active",
        configuration: JSON.stringify({
          theme: "default",
          currency: "USD",
          language: "en",
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create promotion targeting the specific channel
  const promotionTypes = ["sale", "clearance", "loyalty", "seasonal"] as const;
  const promotionType = RandomGenerator.pick(promotionTypes);

  const now = new Date();
  const startDate = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow
  const endDate = new Date(now.getTime() + 2592000000).toISOString(); // 30 days from now
  const promotionName = `Promotion_${RandomGenerator.alphaNumeric(6)}`;
  const promotionDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 4,
    sentenceMax: 8,
  });
  const promotionPriority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  const promotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotionName,
        description: promotionDescription,
        promotion_type: promotionType,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        priority: promotionPriority,
        channel_id: channel.id,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(promotion);

  // Step 4: Validate promotion-channel association and promotion properties
  await TestValidator.equals(
    "promotion name should match creation input",
    promotion.name,
    promotionName,
  );

  await TestValidator.equals(
    "promotion type should match creation input",
    promotion.promotion_type,
    promotionType,
  );

  await TestValidator.equals(
    "promotion start date should match creation input",
    promotion.start_date,
    startDate,
  );

  await TestValidator.equals(
    "promotion end date should match creation input",
    promotion.end_date,
    endDate,
  );

  await TestValidator.predicate(
    "promotion should be active",
    promotion.is_active === true,
  );

  await TestValidator.predicate(
    "promotion priority should be within valid range",
    promotion.priority >= 1 && promotion.priority <= 100,
  );

  await TestValidator.predicate(
    "promotion should have channel association",
    promotion.channel !== undefined && promotion.channel !== null,
  );

  await TestValidator.equals(
    "promotion channel ID should match created channel",
    promotion.channel?.id,
    channel.id,
  );

  await TestValidator.equals(
    "promotion channel name should match created channel",
    promotion.channel?.name,
    channel.name,
  );

  await TestValidator.equals(
    "promotion channel code should match created channel",
    promotion.channel?.code,
    channel.code,
  );

  await TestValidator.predicate(
    "promotion should have creator information",
    promotion.creator !== undefined && promotion.creator.id !== undefined,
  );

  await TestValidator.equals(
    "promotion creator should match admin account",
    promotion.creator.id,
    adminAuth.administrator.id,
  );

  await TestValidator.predicate(
    "promotion should have creation timestamp",
    promotion.created_at !== undefined && promotion.created_at !== null,
  );

  await TestValidator.predicate(
    "promotion should have update timestamp",
    promotion.updated_at !== undefined && promotion.updated_at !== null,
  );
}
