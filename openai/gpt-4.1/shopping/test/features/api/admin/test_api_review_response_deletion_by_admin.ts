import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that an admin can delete a seller's response to a customer review.
 * (Partial scenario only, as creation/fetch is not possible)
 *
 * 1. Register a new admin (using /auth/admin/join).
 * 2. Perform DELETE /shoppingMall/admin/reviews/{reviewId}/responses/{responseId}
 *    with random UUIDs (since creation/fetch is not available).
 * 3. Confirm the request does not error—permission and API route is enforced for
 *    admins.
 *
 * This test can only verify that administrator authentication enables access
 * and that the endpoint is wired for DELETE, since no creation or retrieval
 * APIs exist for reviews or responses to test further side effects.
 */
export async function test_api_review_response_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/admin authentication
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Attempt to delete a seller response (simulate random UUIDs for review/response as actual creation is not possible)
  await api.functional.shoppingMall.admin.reviews.responses.erase(connection, {
    reviewId: typia.random<string & tags.Format<"uuid">>(),
    responseId: typia.random<string & tags.Format<"uuid">>(),
  });
  // 3. If no error, the admin authority and endpoint wiring are functional.
}
