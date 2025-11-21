import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_review_deletion_invalid_uuid_format(
  connection: api.IConnection,
) {
  // 1. Create admin account to authenticate the deletion request
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Test deletion of a review with an invalid UUID format (non-UUID string)
  // This should fail with a 400 Bad Request response as per the scenario
  // We provide a malformed reviewId that is not a valid UUID format
  await TestValidator.error(
    "deletion should fail with invalid UUID format",
    async () => {
      await api.functional.shoppingMall.admin.reviews.erase(connection, {
        reviewId: "not-a-valid-uuid-format", // Invalid UUID format - should trigger validation error
      });
    },
  );
}
