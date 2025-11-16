import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that an authenticated admin can soft-delete a refund request by setting
 * 'deleted_at'.
 *
 * 1. Register a new admin to establish authentication context
 * 2. Soft-delete (erase) a refund request specified by a random UUID (simulate
 *    existing ID)
 * 3. Assert successful response and that 'deleted_at' is set in output
 * 4. Attempt erase with unauthenticated context and ensure error is raised
 */
export async function test_api_refund_request_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register (onboard) new admin for authentication
  const adminJoin = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  };
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, adminJoin);
  typia.assert(admin);
  TestValidator.equals(
    "responded admin email matches input",
    admin.email,
    adminJoin.body.email,
  );

  // 2. (Admin authenticated) Soft-delete a refund request by random UUID
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const out: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.erase(connection, {
      refundRequestId,
    });
  typia.assert(out);

  // 3. Verify 'deleted_at' is set (must be date-time string, not null/undefined)
  TestValidator.predicate(
    "deleted_at is non-null string after soft-delete",
    typeof out.deleted_at === "string" && !!out.deleted_at,
  );

  // 4. Create unauthenticated connection and verify erase fails
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user is rejected from erase refundRequest endpoint",
    async () => {
      await api.functional.shoppingMall.admin.refundRequests.erase(unauthConn, {
        refundRequestId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
