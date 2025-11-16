import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that updating a non-existent platform admin role fails with a
 * not-found style HTTP error.
 *
 * Business purpose: Platform administrators must not be able to accidentally
 * create or revive roles by calling the update endpoint with an arbitrary
 * `adminRoleCode`. The PUT
 * `/shoppingMall/platformAdmin/adminRoles/{adminRoleCode}` operation is defined
 * to update an existing role identified by its `code`. If the code does not
 * exist, or if it refers to a logically deleted role (`deleted_at` not null),
 * the backend must respond with a client error such as 404/410 and must _not_
 * create or reactivate the role.
 *
 * Test workflow:
 *
 * 1. Bootstrap a platform admin session via POST `/auth/platformAdmin/join` using
 *    a random but valid IShoppingMallPlatformAdminJoin.IRequest payload.
 * 2. Generate a random `adminRoleCode` string that is extremely unlikely to
 *    collide with any existing role code (e.g., by combining a fixed prefix
 *    with RandomGenerator.alphaNumeric).
 * 3. Prepare a syntactically valid `IShoppingMallAdminRole.IUpdate` body (e.g.,
 *    set `name` and `description_text`) to simulate a legitimate update
 *    attempt.
 * 4. Call `api.functional.shoppingMall.platformAdmin.adminRoles.update` with the
 *    nonexistent `adminRoleCode` and the valid update body, expecting the
 *    backend to reject the request.
 * 5. Use `TestValidator.httpError` to assert that the call yields an HttpError in
 *    the 4xx range that corresponds to a not-found style condition (404/410).
 *    We must not check the exact numeric code beyond belonging to 4xx class if
 *    that is not specified, but the intent is that it should be a client-side
 *    not-found/forbidden style error, not success.
 * 6. Do not attempt to verify persistence-level side effects (creation or
 *    reactivation) because no role listing or retrieval API is available in the
 *    provided SDK. Instead, the contract that `update` does not create entities
 *    is indirectly validated by the fact that it fails for missing codes.
 *
 * Constraints and safety:
 *
 * - All request bodies must strictly satisfy their DTO types; no `as any`, no
 *   missing required fields, and no intentional type mismatches.
 * - We must not touch `connection.headers` directly; join() already manages
 *   authentication tokens.
 * - Use TestValidator.httpError with `await` because the closure is async.
 */
export async function test_api_admin_role_update_nonexistent_code_not_found(
  connection: api.IConnection,
) {
  // Step 1: Bootstrap a platform admin session via POST /auth/platformAdmin/join
  const joinBody = {
    email: `platform-admin+nonexistent-role-${RandomGenerator.alphaNumeric(12)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  // Type-level guarantee and runtime schema validation
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Step 2: Generate a random adminRoleCode that is extremely unlikely to exist
  const nonexistentRoleCode: string = `NON_EXISTENT_ROLE_${RandomGenerator.alphaNumeric(24)}`;

  // Step 3: Prepare a syntactically valid IShoppingMallAdminRole.IUpdate body
  const updateBody = {
    name: `Nonexistent Role ${RandomGenerator.name(1)}`,
    description_text: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAdminRole.IUpdate;

  // Step 4 & 5: Attempt to update and assert a not-found style HTTP error.
  // We expect a 4xx error (commonly 404 or 410) when the role code does not exist.
  await TestValidator.httpError(
    "updating a non-existent admin role must result in a client HTTP error (not-found style)",
    [404, 410, 400, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.update(
        connection,
        {
          adminRoleCode: nonexistentRoleCode,
          body: updateBody,
        },
      );
    },
  );
}
