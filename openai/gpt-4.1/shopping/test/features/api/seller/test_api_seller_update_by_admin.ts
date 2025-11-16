import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate update error handling for platform administrator updating seller
 * using PUT /shoppingMall/admin/sellers/{sellerId}.
 *
 * Notes:
 *
 * - As there is no API to create or enumerate seller entities, no positive-path
 *   update with a reachable sellerId can be tested here. For this API surface,
 *   only negative path error scenarios are testable.
 *
 * Steps:
 *
 * 1. Register a new admin account for authentication.
 * 2. Attempt to update a non-existent seller (random UUID) and ensure the system
 *    rejects it.
 * 3. Validate that request with an unauthenticated connection is rejected.
 */
export async function test_api_seller_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!1A",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // Prepare nonexistent sellerId
  const sellerId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  // Prepare random update body
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    business_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    registration_number: RandomGenerator.alphaNumeric(12),
    business_phone: RandomGenerator.mobile(),
    is_email_verified: true,
    status: RandomGenerator.pick([
      "pending",
      "approved",
      "rejected",
      "suspended",
    ] as const),
  } satisfies IShoppingMallSeller.IUpdate;

  // 2. Negative test: updating non-existent sellerId yields error
  await TestValidator.error("invalid sellerId is rejected", async () => {
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId,
      body: updateBody,
    });
  });

  // 3. Negative test: unauthenticated request is rejected
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated fails update", async () => {
    await api.functional.shoppingMall.admin.sellers.update(unauthConn, {
      sellerId,
      body: updateBody,
    });
  });
}
