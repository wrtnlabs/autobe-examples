import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerification";

/**
 * E2E test for verifying that a platform admin can retrieve a specific seller
 * verification record by sellerId and verificationId after proper
 * authentication, and that authorization and error handling work as expected.
 *
 * 1. Register a new admin using /auth/admin/join and random credentials.
 * 2. Generate random UUIDs for sellerId and verificationId to simulate identifiers
 *    for retrieval.
 * 3. Call GET
 *    /shoppingMall/admin/sellers/{sellerId}/verifications/{verificationId}
 *    using the admin credentials.
 * 4. Validate that the response contains all required schema fields and nested
 *    objects (typia.assert on response).
 * 5. Attempt to retrieve with an invalid (different/random) sellerId or
 *    verificationId and confirm error is thrown (TestValidator.error).
 * 6. Ensure all API calls use proper awaits and correct type usage per SDK
 *    requirements.
 */
export async function test_api_seller_verification_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin for privileged access
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10) + "1A@z",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Generate UUIDs for sellerId and verificationId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const verificationId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve seller verification record
  const result =
    await api.functional.shoppingMall.admin.sellers.verifications.at(
      connection,
      {
        sellerId,
        verificationId,
      },
    );
  typia.assert(result);

  // 4. Not-found error with unusable IDs
  await TestValidator.error(
    "should throw error for nonexistent verificationId",
    async () => {
      await api.functional.shoppingMall.admin.sellers.verifications.at(
        connection,
        {
          sellerId,
          verificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "should throw error for nonexistent sellerId",
    async () => {
      await api.functional.shoppingMall.admin.sellers.verifications.at(
        connection,
        {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          verificationId,
        },
      );
    },
  );
}
