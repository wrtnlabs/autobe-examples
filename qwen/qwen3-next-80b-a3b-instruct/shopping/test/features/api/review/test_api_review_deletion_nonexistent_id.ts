import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_review_deletion_nonexistent_id(
  connection: api.IConnection,
) {
  // Create admin account for authentication
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create a second admin account to maintain auth context
  const admin2: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin2);

  // Create a third admin account to maintain auth context
  const admin3: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin3);

  // Attempt to delete a non-existent review using a random UUID
  // This should fail with 404 Not Found
  await TestValidator.error(
    "deletion of non-existent review should fail with 404",
    async () => {
      await api.functional.shoppingMall.admin.reviews.erase(connection, {
        reviewId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
