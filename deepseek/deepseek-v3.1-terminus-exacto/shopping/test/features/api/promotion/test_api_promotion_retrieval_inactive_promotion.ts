import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test retrieval of inactive promotion details.
 *
 * Validates that administrators can access promotion information regardless of
 * active status, ensuring that promotion data remains accessible for reporting
 * and management purposes even when campaigns are not currently running.
 */
export async function test_api_promotion_retrieval_inactive_promotion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create inactive promotion with future dates
  const promotionName = RandomGenerator.alphaNumeric(10);
  const currentDate = new Date();
  const futureStartDate = new Date(
    currentDate.getTime() + 86400000,
  ).toISOString(); // Tomorrow
  const futureEndDate = new Date(
    currentDate.getTime() + 172800000,
  ).toISOString(); // Day after tomorrow

  const createdPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotionName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        promotion_type: "sale",
        start_date: futureStartDate,
        end_date: futureEndDate,
        is_active: false, // Explicitly inactive
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(createdPromotion);

  // Step 3: Retrieve the inactive promotion by name
  const retrievedPromotion =
    await api.functional.shoppingMall.admin.promotions.at(connection, {
      promotionName: promotionName,
    });
  typia.assert(retrievedPromotion);

  // Step 4: Validate that inactive promotion is accessible and data matches
  TestValidator.equals(
    "promotion name matches",
    retrievedPromotion.name,
    createdPromotion.name,
  );
  TestValidator.equals(
    "promotion description matches",
    retrievedPromotion.description,
    createdPromotion.description,
  );
  TestValidator.equals(
    "promotion type matches",
    retrievedPromotion.promotion_type,
    createdPromotion.promotion_type,
  );
  TestValidator.equals(
    "start date matches",
    retrievedPromotion.start_date,
    createdPromotion.start_date,
  );
  TestValidator.equals(
    "end date matches",
    retrievedPromotion.end_date,
    createdPromotion.end_date,
  );
  TestValidator.equals(
    "is_active status matches",
    retrievedPromotion.is_active,
    createdPromotion.is_active,
  );
  TestValidator.equals(
    "priority matches",
    retrievedPromotion.priority,
    createdPromotion.priority,
  );

  // Additional validation: Ensure promotion is indeed inactive
  TestValidator.predicate(
    "promotion should be inactive",
    retrievedPromotion.is_active === false,
  );

  // Validate date logic: start date should be before end date
  TestValidator.predicate(
    "start date should be before end date",
    new Date(retrievedPromotion.start_date) <
      new Date(retrievedPromotion.end_date),
  );
}
