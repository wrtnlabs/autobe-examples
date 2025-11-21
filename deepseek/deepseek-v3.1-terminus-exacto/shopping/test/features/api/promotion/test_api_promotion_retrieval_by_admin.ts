import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test successful retrieval of promotion details by authenticated
 * administrator.
 *
 * This E2E test validates that administrators can access comprehensive
 * promotion information including name, description, promotion type, scheduling
 * dates, active status, priority level, and associated channel details. The
 * test ensures proper authentication context and authorization checks are
 * enforced for promotion data access.
 */
export async function test_api_promotion_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ access_level: "admin" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create promotion record to retrieve for testing
  const promotionName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const startDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const endDate = new Date(Date.now() + 604800000).toISOString(); // 7 days from now

  const createdPromotion =
    await api.functional.shoppingMall.admin.promotions.create(connection, {
      body: {
        name: promotionName,
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        promotion_type: "sale",
        start_date: startDate,
        end_date: endDate,
        is_active: true,
        priority: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IShoppingMallPromotion.ICreate,
    });
  typia.assert(createdPromotion);

  // Step 3: Retrieve promotion details by name
  const retrievedPromotion =
    await api.functional.shoppingMall.admin.promotions.at(connection, {
      promotionName: promotionName,
    });
  typia.assert(retrievedPromotion);

  // Step 4: Validate retrieved promotion matches created promotion
  TestValidator.equals(
    "promotion ID matches",
    retrievedPromotion.id,
    createdPromotion.id,
  );
  TestValidator.equals(
    "promotion name matches",
    retrievedPromotion.name,
    promotionName,
  );
  TestValidator.equals(
    "promotion type matches",
    retrievedPromotion.promotion_type,
    "sale",
  );
  TestValidator.equals(
    "start date matches",
    retrievedPromotion.start_date,
    startDate,
  );
  TestValidator.equals(
    "end date matches",
    retrievedPromotion.end_date,
    endDate,
  );
  TestValidator.predicate("promotion is active", retrievedPromotion.is_active);
  TestValidator.equals(
    "priority matches",
    retrievedPromotion.priority,
    createdPromotion.priority,
  );
  TestValidator.equals(
    "creator ID matches",
    retrievedPromotion.creator.id,
    admin.administrator.id,
  );
}
