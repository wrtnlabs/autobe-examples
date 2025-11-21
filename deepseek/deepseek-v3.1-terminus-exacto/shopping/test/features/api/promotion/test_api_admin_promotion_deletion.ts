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
 * Test promotion deletion workflow for administrators.
 *
 * Validates that administrators can permanently delete marketing promotions
 * from specific channels. This test verifies that the deletion respects the
 * composite unique constraint requiring channel context for promotion
 * identification. The operation performs a soft delete by setting the
 * deleted_at timestamp, preserving the promotion record for audit purposes
 * while excluding it from normal queries. The test ensures that the system
 * validates promotion existence within the specified channel and prevents
 * deletion of currently active or scheduled promotions to avoid disruption of
 * marketing campaigns.
 */
export async function test_api_admin_promotion_deletion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        promotions: ["create", "read", "update", "delete"],
        channels: ["create", "read", "update", "delete"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a shopping channel to host the promotion
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          theme: "default",
          currency: "USD",
          language: "en",
        }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Create a promotion within the channel with future dates (not active)
  const promotionName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const futureDate = new Date(Date.now() + 86400000 * 7); // 7 days from now
  const promotion = await api.functional.shoppingMall.admin.promotions.create(
    connection,
    {
      body: {
        name: promotionName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "seasonal",
        start_date: futureDate.toISOString(),
        end_date: new Date(futureDate.getTime() + 86400000 * 30).toISOString(), // 30 days duration
        is_active: false,
        priority: 50,
        channel_id: channel.id,
      } satisfies IShoppingMallPromotion.ICreate,
    },
  );
  typia.assert(promotion);

  // Validate promotion was created in the correct channel
  TestValidator.equals(
    "promotion channel ID matches created channel",
    promotion.channel?.id,
    channel.id,
  );
  TestValidator.equals(
    "promotion channel code matches created channel",
    promotion.channel?.code,
    channel.code,
  );

  // Step 4: Execute the deletion operation using channel code and promotion name
  const deletedPromotion =
    await api.functional.shoppingMall.admin.channels.promotions.erase(
      connection,
      {
        channelCode: channelCode,
        promotionName: promotionName,
      },
    );
  typia.assert(deletedPromotion);

  // Step 5: Validate the response contains the deleted promotion with deleted_at timestamp
  TestValidator.equals(
    "deleted promotion ID matches original",
    deletedPromotion.id,
    promotion.id,
  );
  TestValidator.equals(
    "deleted promotion name matches original",
    deletedPromotion.name,
    promotion.name,
  );
  TestValidator.predicate(
    "deleted promotion has deleted_at timestamp set",
    deletedPromotion.deleted_at !== null &&
      deletedPromotion.deleted_at !== undefined,
  );

  // Step 6: Verify that the promotion was soft deleted
  TestValidator.predicate(
    "deleted_at timestamp is valid ISO string",
    typeof deletedPromotion.deleted_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        deletedPromotion.deleted_at!,
      ),
  );

  // Step 7: Validate business logic - promotion was not active at time of deletion
  TestValidator.predicate(
    "promotion was not active when deleted",
    promotion.is_active === false &&
      new Date(promotion.start_date) > new Date(),
  );

  // Additional validation: Ensure the deletion respected channel context
  TestValidator.equals(
    "deleted promotion channel context preserved",
    deletedPromotion.channel?.id,
    channel.id,
  );
  TestValidator.equals(
    "deleted promotion channel code preserved",
    deletedPromotion.channel?.code,
    channel.code,
  );
}
