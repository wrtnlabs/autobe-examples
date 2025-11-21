import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPromotion";

/**
 * Test promotion retrieval when promotion name does not exist.
 *
 * Validates proper error handling and response when attempting to access a
 * promotion that has not been created or has been deleted. Ensures the system
 * returns appropriate error codes and messages for non-existent promotion
 * names.
 *
 * This test follows a realistic business workflow:
 *
 * 1. Create administrator account for authentication context
 * 2. Attempt to retrieve promotion using non-existent promotion name
 * 3. Validate proper error handling for non-existent promotion scenario
 */
export async function test_api_promotion_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "support_admin",
        permissions: JSON.stringify({
          promotions: ["read", "write"],
        }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to retrieve promotion using non-existent promotion name
  const nonExistentPromotionName = RandomGenerator.paragraph({ sentences: 3 });

  await TestValidator.error(
    "retrieving non-existent promotion should fail",
    async () => {
      await api.functional.shoppingMall.admin.promotions.at(connection, {
        promotionName: nonExistentPromotionName,
      });
    },
  );
}
