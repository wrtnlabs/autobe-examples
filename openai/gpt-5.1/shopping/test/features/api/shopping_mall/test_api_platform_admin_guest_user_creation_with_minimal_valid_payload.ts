import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate minimal guest user creation via platform admin context.
 *
 * Business goal
 *
 * - Ensure platform admins can materialize a guest user using the minimal
 *   required payload (only `temporary_identifier`) while server-managed fields
 *   such as `id` and timestamps are correctly populated.
 * - Confirm that the platform admin join flow provides a valid authenticated
 *   session that can call protected `platformAdmin` guest user APIs.
 *
 * Scenario steps
 *
 * 1. Register a new platform administrator with a realistic join payload
 *
 *    - Use `typia.random<IShoppingMallPlatformAdminJoin.IRequest>()` to construct a
 *         valid request including email, name, password and URLs.
 *    - Call `api.functional.auth.platformAdmin.join` and assert the returned
 *         `IShoppingMallPlatformAdmin.IAuthorized` object.
 *    - This call also wires the `Authorization` header on the connection so
 *         subsequent calls execute under platform admin context.
 * 2. Create a guest user with minimal valid payload
 *
 *    - Build a request body that satisfies `IShoppingMallGuestUser.ICreate` but sets
 *         only the required `temporary_identifier` field. (Intentionally omit
 *         optional `user_agent` to verify minimal payload.)
 *    - Call `api.functional.shoppingMall.platformAdmin.guestUsers.create` with this
 *         minimal body and assert the returned `IShoppingMallGuestUser`.
 * 3. Validate response semantics and server-managed fields
 *
 *    - Use `TestValidator.equals` to ensure the response `temporary_identifier`
 *         exactly matches the requested value.
 *    - Use `TestValidator.predicate` to check that:
 *
 *         - `created_at` and `updated_at` are non-empty strings, implying the server
 *                   populated timestamps.
 *         - `deleted_at` is null or undefined for a freshly created guest user.
 *
 * Notes
 *
 * - No GET-by-id endpoint is provided in the available SDK, so this test focuses
 *   solely on the create operation and its immediate response.
 */
export async function test_api_platform_admin_guest_user_creation_with_minimal_valid_payload(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authorized session
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a guest user with minimal valid payload (only required field)
  const temporaryIdentifier = RandomGenerator.alphaNumeric(32);
  const guestUser: IShoppingMallGuestUser =
    await api.functional.shoppingMall.platformAdmin.guestUsers.create(
      connection,
      {
        body: {
          temporary_identifier: temporaryIdentifier,
        } satisfies IShoppingMallGuestUser.ICreate,
      },
    );
  typia.assert(guestUser);

  // 3. Validate response semantics and server-managed fields
  TestValidator.equals(
    "temporary_identifier should echo input",
    guestUser.temporary_identifier,
    temporaryIdentifier,
  );

  TestValidator.predicate(
    "created_at must be a non-empty timestamp string",
    guestUser.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at must be a non-empty timestamp string",
    guestUser.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null or undefined for a newly created guest",
    guestUser.deleted_at === null || guestUser.deleted_at === undefined,
  );
}
