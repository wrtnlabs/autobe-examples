import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * End-to-end test for hard deletion of a return/pickup request by an admin.
 *
 * 1. Register a new admin account by joining, verifying that admin authentication
 *    context is established.
 * 2. Generate a synthetic returnRequestId (no create/retrieve API available),
 *    mimicking an existing resource.
 * 3. Perform deletion as authenticated admin: verifies that the API endpoint is
 *    callable for allowed actor.
 * 4. Attempt to delete a non-existent returnRequestId: expects error.
 * 5. Attempt repeated deletion of the same returnRequestId (already deleted):
 *    expects error.
 * 6. Attempt deletion with a new unauthenticated connection (no admin login):
 *    expects error due to lack of permissions.
 *
 * The test ensures that only admins may perform hard deletes, deletion is
 * permanent, attempts to delete non-existent resources fail, and orphaned IDs
 * yield a proper error without system data leakage or side effects. All ID
 * values use correct UUID formats. Side-effects cannot be verified beyond
 * allowed API due to lack of retrieval.
 */
export async function test_api_return_request_hard_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin (join)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // 2. Generate a synthetic return request id in UUID format
  const returnRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt deletion as authenticated admin (should succeed, even if record doesn't truly exist)
  await api.functional.shoppingMall.admin.returnRequests.erase(connection, {
    returnRequestId,
  });

  // 4. Attempt to delete a totally different random UUID (guaranteed not to exist)
  const garbageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting a completely non-existent returnRequestId should error",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.erase(connection, {
        returnRequestId: garbageId,
      });
    },
  );

  // 5. Attempt to delete same (already deleted) returnRequestId
  await TestValidator.error(
    "re-deleting same returnRequestId after hard delete should error",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.erase(connection, {
        returnRequestId,
      });
    },
  );

  // 6. Attempt deletion with an unauthenticated connection (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const yetAnotherId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "deleting as non-authenticated actor should be forbidden",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.erase(unauthConn, {
        returnRequestId: yetAnotherId,
      });
    },
  );
}
