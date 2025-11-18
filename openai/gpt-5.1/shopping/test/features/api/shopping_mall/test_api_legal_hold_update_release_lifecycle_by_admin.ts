import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate that an admin can release a legal hold via update and that
 * release-related fields and admin attribution are persisted correctly.
 *
 * Business workflow:
 *
 * 1. Register an admin (Admin A) via POST /auth/admin/join and obtain
 *    authorization context (IShoppingMallAdmin.IAuthorized).
 * 2. Using Admin A’s authenticated connection, create a new active legal hold via
 *    POST /shoppingMall/admin/legalHolds with no release information set.
 * 3. Verify the created legal hold has no release metadata and is not deleted.
 * 4. Transition the legal hold to a released state via PUT
 *    /shoppingMall/admin/legalHolds/{legalHoldCode}, setting status and
 *    released_at, and relying on the backend to fill released_by_admin_id and
 *    released_by_admin based on the authenticated admin.
 * 5. Assert that the updated legal hold reflects the released state, that the
 *    release timestamp matches the requested value, and that releaser
 *    attribution points to Admin A while deleted_at remains null.
 * 6. Re-fetch the legal hold via GET
 *    /shoppingMall/admin/legalHolds/{legalHoldCode} and confirm that all
 *    lifecycle-related fields (status, released_at, released_by_admin,
 *    deleted_at) remain consistent with the update result.
 */
export async function test_api_legal_hold_update_release_lifecycle_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication (Admin A)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const adminId = adminAuthorized.id;

  // 2. Create an active legal hold
  const legalHoldCode: string = RandomGenerator.alphaNumeric(16);
  const createBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(createdHold);

  // Basic invariants on creation
  TestValidator.equals(
    "created hold code matches request",
    createdHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "created hold status is active",
    createdHold.status,
    "active",
  );
  TestValidator.equals(
    "created hold released_at is null or undefined",
    createdHold.released_at ?? null,
    null,
  );
  TestValidator.equals(
    "created hold released_by_admin_id is null or undefined",
    createdHold.released_by_admin_id ?? null,
    null,
  );
  TestValidator.equals(
    "created hold released_by_admin is null or undefined",
    createdHold.released_by_admin ?? null,
    null,
  );
  TestValidator.equals(
    "created hold deleted_at is null or undefined",
    createdHold.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "created hold created_by_admin_id matches admin id",
    createdHold.created_by_admin_id,
    adminId,
  );

  // 3. Release the legal hold via update
  const releaseAt: string = new Date(Date.now() + 1_000).toISOString();
  const updateBody = {
    status: "released",
    released_at: releaseAt,
  } satisfies IShoppingMallLegalHold.IUpdate;

  const releasedHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode,
      body: updateBody,
    });
  typia.assert(releasedHold);

  // Validate release state
  TestValidator.equals(
    "released hold code remains unchanged",
    releasedHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "released hold status is released",
    releasedHold.status,
    "released",
  );
  TestValidator.equals(
    "released hold released_at matches requested releaseAt",
    releasedHold.released_at,
    releaseAt,
  );
  TestValidator.predicate(
    "released_by_admin_id is populated",
    releasedHold.released_by_admin_id !== null &&
      releasedHold.released_by_admin_id !== undefined,
  );
  TestValidator.equals(
    "released_by_admin_id equals admin id",
    releasedHold.released_by_admin_id!,
    adminId,
  );
  TestValidator.predicate(
    "released_by_admin summary is populated",
    releasedHold.released_by_admin !== null &&
      releasedHold.released_by_admin !== undefined,
  );
  if (
    releasedHold.released_by_admin !== null &&
    releasedHold.released_by_admin !== undefined
  ) {
    TestValidator.equals(
      "released_by_admin.id equals admin id",
      releasedHold.released_by_admin.id,
      adminId,
    );
  }
  TestValidator.equals(
    "released hold created_by_admin_id remains admin id",
    releasedHold.created_by_admin_id,
    adminId,
  );
  TestValidator.equals(
    "released hold deleted_at is still null or undefined",
    releasedHold.deleted_at ?? null,
    null,
  );

  // 4. Re-fetch the hold and verify persistence
  const reloadedHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode,
    });
  typia.assert(reloadedHold);

  TestValidator.equals(
    "reloaded hold code matches original",
    reloadedHold.code,
    legalHoldCode,
  );
  TestValidator.equals(
    "reloaded hold status is released",
    reloadedHold.status,
    "released",
  );
  TestValidator.equals(
    "reloaded hold released_at matches releaseAt",
    reloadedHold.released_at,
    releaseAt,
  );
  TestValidator.equals(
    "reloaded hold released_by_admin_id equals admin id",
    reloadedHold.released_by_admin_id!,
    adminId,
  );
  TestValidator.predicate(
    "reloaded hold released_by_admin summary is populated",
    reloadedHold.released_by_admin !== null &&
      reloadedHold.released_by_admin !== undefined,
  );
  if (
    reloadedHold.released_by_admin !== null &&
    reloadedHold.released_by_admin !== undefined
  ) {
    TestValidator.equals(
      "reloaded hold released_by_admin.id equals admin id",
      reloadedHold.released_by_admin.id,
      adminId,
    );
  }
  TestValidator.equals(
    "reloaded hold created_by_admin_id remains admin id",
    reloadedHold.created_by_admin_id,
    adminId,
  );
  TestValidator.equals(
    "reloaded hold deleted_at is still null or undefined",
    reloadedHold.deleted_at ?? null,
    null,
  );
}
