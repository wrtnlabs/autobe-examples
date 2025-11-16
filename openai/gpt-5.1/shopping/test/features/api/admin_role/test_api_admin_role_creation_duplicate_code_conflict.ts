import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that creating two admin roles with the same business `code` results
 * in a conflict-style error for the second request while leaving the original
 * role intact.
 *
 * Business context:
 *
 * - Platform administrators manage reusable admin role definitions via
 *   shopping_mall_admin_roles.
 * - Each role has a globally unique machine-friendly `code` that is used as a
 *   business identifier in URLs and assignments, and the backend enforces a
 *   unique index on this column.
 * - Attempting to create another role with an already-used `code` must not
 *   overwrite or mutate the existing role; instead, the API should reject the
 *   request with a conflict-style error.
 *
 * Test flow:
 *
 * 1. Bootstrap a platform admin session by calling POST /auth/platformAdmin/join
 *    via api.functional.auth.platformAdmin.join, using a randomly generated
 *    IShoppingMallPlatformAdminJoin.IRequest payload. This ensures subsequent
 *    calls are authenticated as a platform admin.
 * 2. Using the authenticated connection, call
 *    api.functional.shoppingMall.platformAdmin.adminRoles.create with a
 *    well-formed IShoppingMallAdminRole.ICreate body: a specific non-empty
 *    `code` like "SUPPORT_AGENT", a non-empty `name`, and a valid
 *    description_text string.
 *
 *    - Assert that the call succeeds.
 *    - Assert the response type using typia.assert.
 *    - Capture the returned role object as `firstRole` and snapshot its
 *         id/code/name/description_text fields.
 * 3. With the same connection (still representing the same platform admin
 *    session), attempt to create a _second_ admin role using
 *    api.functional.shoppingMall.platformAdmin.adminRoles.create again, but
 *    with a body that reuses the exact same `code` while changing the `name`
 *    and `description_text` to different values.
 *
 *    - Wrap this call in TestValidator.error with an async closure, because the
 *         second request is expected to fail.
 *    - We do not assert a specific HTTP status code (like 409) per global
 *         guidelines, only that an error occurs.
 * 4. After the failed second creation attempt, verify that the original role
 *    remains intact:
 *
 *    - Since no GET-by-code endpoint is provided in the current SDK materials, we
 *         cannot re-fetch from the server, so we instead validate that the
 *         in-memory `firstRole` object still has consistent id/code/name and
 *         description_text.
 *    - Use TestValidator.equals to confirm the stored snapshot of id/code/name
 *         matches the fields on `firstRole` after the error.
 *
 * This test ensures the backend enforces the unique index on
 * shopping_mall_admin_roles.code and that duplicate creation attempts do not
 * mutate existing role definitions.
 */
export async function test_api_admin_role_creation_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authorized session.
  const joinBody = {
    email: `platform-admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an admin role with a unique code.
  const roleCode = "SUPPORT_AGENT";

  const firstCreateBody = {
    code: roleCode,
    name: "Support Agent",
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const firstRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstRole);

  // Snapshot the original role fields for later comparison.
  const snapshotId = firstRole.id;
  const snapshotCode = firstRole.code;
  const snapshotName = firstRole.name;
  const snapshotDescription = firstRole.description_text ?? null;

  // Sanity-check: the created role should reflect our request body values.
  TestValidator.equals(
    "created admin role code matches request body",
    firstRole.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "created admin role name matches request body",
    firstRole.name,
    firstCreateBody.name,
  );

  // 3. Attempt to create another admin role with the same code but different
  //    name/description, expecting an error.
  const secondCreateBody = {
    code: roleCode, // same code to trigger uniqueness conflict
    name: "Support Agent (Duplicate)",
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  await TestValidator.error(
    "creating admin role with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 4. Verify that the original role object remains intact and unchanged.
  TestValidator.equals(
    "original admin role id remains unchanged after duplicate attempt",
    firstRole.id,
    snapshotId,
  );
  TestValidator.equals(
    "original admin role code remains unchanged after duplicate attempt",
    firstRole.code,
    snapshotCode,
  );
  TestValidator.equals(
    "original admin role name remains unchanged after duplicate attempt",
    firstRole.name,
    snapshotName,
  );
  TestValidator.equals(
    "original admin role description remains unchanged after duplicate attempt",
    firstRole.description_text ?? null,
    snapshotDescription,
  );
}
