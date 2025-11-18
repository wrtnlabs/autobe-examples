import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Verify that an admin can explicitly clear nullable fields on a legal hold via
 * IShoppingMallLegalHold.IUpdate by setting them to null, and that those nulls
 * are persisted without altering immutable attributes.
 *
 * Flow:
 *
 * 1. Join an admin account using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Create a legal hold via POST /shoppingMall/admin/legalHolds with all nullable
 *    descriptive/date fields populated with non-null values.
 * 3. Optionally re-fetch the legal hold by code to confirm initial persisted
 *    values.
 * 4. Update the legal hold via PUT /shoppingMall/admin/legalHolds/{legalHoldCode}
 *    setting description, scope_description, external_reference,
 *    effective_from, and released_at explicitly to null, omitting other fields
 *    such as title and status.
 * 5. Assert that the update response has those fields set to null while code,
 *    title, status, created_by_admin_id, and created_at remain unchanged.
 * 6. Re-fetch the legal hold by code and assert that the persisted record matches
 *    the update response, proving that explicit nulling is durable.
 */
export async function test_api_legal_hold_update_optional_field_clearing_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a legal hold with all nullable fields non-null
  const initialEffectiveFrom = new Date().toISOString();

  const createBody = {
    code: `LH-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(6)}`,
    effective_from: initialEffectiveFrom,
  } satisfies IShoppingMallLegalHold.ICreate;

  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Sanity check: nullable fields should be non-null right after creation
  TestValidator.predicate(
    "created.description is initially non-null",
    created.description !== null && created.description !== undefined,
  );
  TestValidator.predicate(
    "created.scope_description is initially non-null",
    created.scope_description !== null &&
      created.scope_description !== undefined,
  );
  TestValidator.predicate(
    "created.external_reference is initially non-null",
    created.external_reference !== null &&
      created.external_reference !== undefined,
  );
  TestValidator.predicate(
    "created.effective_from is initially non-null",
    created.effective_from !== null && created.effective_from !== undefined,
  );

  const originalCode = created.code;
  const originalTitle = created.title;
  const originalStatus = created.status;
  const originalCreatedAt = created.created_at;
  const originalCreatedByAdminId = created.created_by_admin_id;

  // 3. Fetch via GET to ensure code lookup and baseline values
  const beforeUpdate: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: originalCode,
    });
  typia.assert(beforeUpdate);

  TestValidator.equals(
    "beforeUpdate matches created by code on id",
    beforeUpdate.id,
    created.id,
  );

  // 4. Update the legal hold setting nullable fields explicitly to null
  const updateBody = {
    description: null,
    scope_description: null,
    external_reference: null,
    effective_from: null,
    released_at: null,
  } satisfies IShoppingMallLegalHold.IUpdate;

  const updated: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode: originalCode,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Assert fields are cleared while immutable fields remain unchanged
  TestValidator.equals(
    "updated.description was cleared to null",
    updated.description,
    null,
  );
  TestValidator.equals(
    "updated.scope_description was cleared to null",
    updated.scope_description,
    null,
  );
  TestValidator.equals(
    "updated.external_reference was cleared to null",
    updated.external_reference,
    null,
  );
  TestValidator.equals(
    "updated.effective_from was cleared to null",
    updated.effective_from,
    null,
  );
  TestValidator.equals(
    "updated.released_at was cleared to null",
    updated.released_at,
    null,
  );

  TestValidator.equals(
    "code remains unchanged after nullable-field clearing update",
    updated.code,
    originalCode,
  );
  TestValidator.equals(
    "title remains unchanged when omitted from update",
    updated.title,
    originalTitle,
  );
  TestValidator.equals(
    "status remains unchanged when omitted from update",
    updated.status,
    originalStatus,
  );
  TestValidator.equals(
    "created_at remains unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "created_by_admin_id remains unchanged after update",
    updated.created_by_admin_id,
    originalCreatedByAdminId,
  );

  // 6. Re-fetch after update and ensure persistence of nulls and immutable fields
  const afterUpdate: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: originalCode,
    });
  typia.assert(afterUpdate);

  TestValidator.equals(
    "afterUpdate.description persisted as null",
    afterUpdate.description,
    updated.description,
  );
  TestValidator.equals(
    "afterUpdate.scope_description persisted as null",
    afterUpdate.scope_description,
    updated.scope_description,
  );
  TestValidator.equals(
    "afterUpdate.external_reference persisted as null",
    afterUpdate.external_reference,
    updated.external_reference,
  );
  TestValidator.equals(
    "afterUpdate.effective_from persisted as null",
    afterUpdate.effective_from,
    updated.effective_from,
  );
  TestValidator.equals(
    "afterUpdate.released_at persisted as null",
    afterUpdate.released_at,
    updated.released_at,
  );

  TestValidator.equals(
    "afterUpdate.code matches original code",
    afterUpdate.code,
    originalCode,
  );
  TestValidator.equals(
    "afterUpdate.title matches original title",
    afterUpdate.title,
    originalTitle,
  );
  TestValidator.equals(
    "afterUpdate.status matches original status",
    afterUpdate.status,
    originalStatus,
  );
  TestValidator.equals(
    "afterUpdate.created_at matches original created_at",
    afterUpdate.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "afterUpdate.created_by_admin_id matches original created_by_admin_id",
    afterUpdate.created_by_admin_id,
    originalCreatedByAdminId,
  );
}
