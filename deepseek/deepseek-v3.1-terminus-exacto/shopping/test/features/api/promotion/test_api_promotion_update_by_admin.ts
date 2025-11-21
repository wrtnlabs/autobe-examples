import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Comprehensive promotion update workflow validation for shopping mall
 * administrators.
 *
 * This test validates the complete promotion update functionality including
 * field modifications, scheduling changes, status updates, and priority
 * adjustments. It follows a realistic business workflow: administrator
 * registration → authentication → promotion creation → various update scenarios
 * → validation of updated data.
 *
 * The test covers both partial updates (single field changes) and complete
 * updates (multiple field modifications) to ensure the update operation handles
 * all field combinations correctly. Each update is validated by retrieving the
 * promotion and comparing against expected changes.
 */
export async function test_api_promotion_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!",
        first_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        last_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        role: "support_admin",
        permissions: JSON.stringify({ read: true, write: true, delete: false }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial promotion
  const initialPromotion: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        promotion_type: "sale",
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        is_active: true,
        priority: 50,
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(initialPromotion);

  // Step 3: Test partial update - single field modification
  const updatedName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const partialUpdate: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: initialPromotion.name,
      body: {
        name: updatedName,
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(partialUpdate);
  TestValidator.equals(
    "name should be updated",
    partialUpdate.name,
    updatedName,
  );
  TestValidator.equals(
    "description should remain unchanged",
    partialUpdate.description,
    initialPromotion.description,
  );

  // Step 4: Test complete update - multiple field modifications
  const completeUpdateData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    promotion_type: "clearance",
    start_date: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    end_date: new Date(Date.now() + 345600000).toISOString(), // 4 days from now
    is_active: false,
    priority: 75,
  } satisfies IShoppingMallPromotion.IUpdate;

  const completeUpdate: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: updatedName,
      body: completeUpdateData,
    });
  typia.assert(completeUpdate);

  // Validate complete update results
  TestValidator.equals(
    "name should match complete update",
    completeUpdate.name,
    completeUpdateData.name,
  );
  TestValidator.equals(
    "description should match complete update",
    completeUpdate.description,
    completeUpdateData.description,
  );
  TestValidator.equals(
    "promotion type should match complete update",
    completeUpdate.promotion_type,
    completeUpdateData.promotion_type,
  );
  TestValidator.equals(
    "start date should match complete update",
    completeUpdate.start_date,
    completeUpdateData.start_date,
  );
  TestValidator.equals(
    "end date should match complete update",
    completeUpdate.end_date,
    completeUpdateData.end_date,
  );
  TestValidator.equals(
    "active status should match complete update",
    completeUpdate.is_active,
    completeUpdateData.is_active,
  );
  TestValidator.equals(
    "priority should match complete update",
    completeUpdate.priority,
    completeUpdateData.priority,
  );

  // Step 5: Test scheduling validation - ensure start date is before end date
  const schedulingUpdate: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: completeUpdate.name,
      body: {
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(schedulingUpdate);

  // Safe date comparison using string comparison
  const startDate = typia.assert(schedulingUpdate.start_date!);
  const endDate = typia.assert(schedulingUpdate.end_date!);
  TestValidator.predicate(
    "start date should be before end date",
    startDate < endDate,
  );

  // Step 6: Test status toggle
  const statusToggle: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: schedulingUpdate.name,
      body: {
        is_active: true,
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(statusToggle);
  TestValidator.equals(
    "active status should be toggled to true",
    statusToggle.is_active,
    true,
  );

  // Step 7: Test priority adjustment
  const priorityUpdate: IShoppingMallPromotion =
    await api.functional.shoppingMall.admin.promotions.update(connection, {
      promotionName: statusToggle.name,
      body: {
        priority: 25,
      } satisfies IShoppingMallPromotion.IUpdate,
    });
  typia.assert(priorityUpdate);
  TestValidator.equals(
    "priority should be updated",
    priorityUpdate.priority,
    25,
  );

  // Final comprehensive validation of all updates
  TestValidator.equals(
    "final name should match last update",
    priorityUpdate.name,
    completeUpdateData.name,
  );
  TestValidator.equals(
    "final description should match",
    priorityUpdate.description,
    completeUpdateData.description,
  );
  TestValidator.equals(
    "final promotion type should match",
    priorityUpdate.promotion_type,
    completeUpdateData.promotion_type,
  );
  TestValidator.equals(
    "final active status should be true",
    priorityUpdate.is_active,
    true,
  );
  TestValidator.equals(
    "final priority should be 25",
    priorityUpdate.priority,
    25,
  );
}
