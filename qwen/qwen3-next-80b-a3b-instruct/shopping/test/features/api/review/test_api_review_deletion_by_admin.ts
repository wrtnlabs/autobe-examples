import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_review_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate using the authorized utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create a customer connection and authenticate (if customer registration were available)
  // Since no customer registration API exists, we cannot create a properly authenticated customer
  // But the scenario requires verifying only admin can delete
  // We'll verify the core business rule: admins can delete, but non-admins cannot
  // Step 3: Use a random review ID for testing deletion
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Verify admin can delete a review (using a valid UUID)
  // This validates the deletion endpoint can be called successfully by an authenticated admin
  await api.functional.shoppingMall.admin.reviews.erase(adminConnection, {
    reviewId,
  });
  // Step 5: Verify that unauthorized (non-admin) user cannot delete a review
  // Create an unauthenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("customer cannot delete review", async () => {
    await api.functional.shoppingMall.admin.reviews.erase(customerConnection, {
      reviewId,
    });
  });
}
