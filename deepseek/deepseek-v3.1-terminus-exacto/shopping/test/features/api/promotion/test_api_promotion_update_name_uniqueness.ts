import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test promotion name uniqueness validation during updates.
 *
 * This E2E test validates that the shopping mall platform properly enforces
 * promotion name uniqueness when updating existing promotions. It creates
 * multiple promotions with different names, then attempts to update one
 * promotion's name to match an existing promotion name to verify the system
 * prevents duplicate names.
 */
export async function test_api_promotion_update_name_uniqueness(
  connection: api.IConnection,
) {
  // Create first administrator account
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: admin1Email,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
        permissions: JSON.stringify({ can_manage_promotions: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin1);

  // Create first promotion with unique name
  const promotion1Name = RandomGenerator.paragraph({ sentences: 3 });
  const promotion1: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotion1Name,
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "sale",
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(promotion1);

  // Create second promotion with different unique name
  const promotion2Name = RandomGenerator.paragraph({ sentences: 3 });
  const promotion2: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotion2Name,
        description: RandomGenerator.content({ paragraphs: 2 }),
        promotion_type: "clearance",
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(promotion2);

  // Verify promotions have different names
  TestValidator.notEquals(
    "promotion names should be different",
    promotion1.name,
    promotion2.name,
  );

  // Attempt to update promotion2 with promotion1's name (should fail due to uniqueness constraint)
  await TestValidator.error(
    "should reject duplicate promotion name during update",
    async () => {
      await api.functional.shoppingMall.admin.promotions.update(connection, {
        promotionName: promotion2.name,
        body: {
          name: promotion1Name, // Attempt to use existing name - should fail
        } satisfies IShoppingMallPromotion.IUpdate,
      });
    },
  );

  // Successful update with unique name
  const uniqueNewName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedPromotion2: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: promotion2.name,
      body: {
        name: uniqueNewName,
        description: "Successfully updated with unique name",
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(updatedPromotion2);
  TestValidator.equals(
    "promotion should be updated with unique name",
    updatedPromotion2.name,
    uniqueNewName,
  );

  // Verify the original promotion1 remains unchanged and accessible
  const promotion1Update: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: promotion1.name,
      body: {
        description: "Updated description for promotion1",
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(promotion1Update);
  TestValidator.equals(
    "promotion1 name should remain unchanged",
    promotion1Update.name,
    promotion1.name,
  );

  // Final validation that both promotions exist with their correct names
  TestValidator.equals(
    "promotion1 should maintain original name",
    promotion1Update.name,
    promotion1Name,
  );
  TestValidator.equals(
    "promotion2 should have updated unique name",
    updatedPromotion2.name,
    uniqueNewName,
  );
  TestValidator.notEquals(
    "promotions should have different names",
    promotion1Update.name,
    updatedPromotion2.name,
  );
}
