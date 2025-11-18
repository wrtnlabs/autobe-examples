import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_legal_hold_update_basic_fields_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
    ip: "127.0.0.1",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create an initial legal hold with some baseline values
  const initialCode = `LH-${RandomGenerator.alphaNumeric(12)}`;
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 5 });
  const initialScope = RandomGenerator.paragraph({ sentences: 4 });
  const initialExternalRef = `CASE-${RandomGenerator.alphaNumeric(10)}`;
  const initialEffectiveFrom = new Date().toISOString();

  const createBody = {
    code: initialCode,
    title: initialTitle,
    description: initialDescription,
    status: "draft",
    scope_description: initialScope,
    external_reference: initialExternalRef,
    effective_from: initialEffectiveFrom,
  } satisfies IShoppingMallLegalHold.ICreate;

  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Capture immutable and audit fields before update
  const beforeId = created.id;
  const beforeCode = created.code;
  const beforeCreatedAt = created.created_at;
  const beforeUpdatedAt = created.updated_at;
  const beforeCreatedByAdminId = created.created_by_admin_id;
  const beforeCreatedByAdminSummary = created.created_by_admin;

  // Sanity checks linking created_by_admin to authorized admin summary when present
  if (authorizedAdmin.admin !== undefined) {
    TestValidator.equals(
      "created_by_admin.id should match authorized admin summary id",
      created.created_by_admin.id,
      authorizedAdmin.admin.id,
    );
    TestValidator.equals(
      "created_by_admin.email should match authorized admin summary email",
      created.created_by_admin.email,
      authorizedAdmin.admin.email,
    );
  }

  TestValidator.equals(
    "created_by_admin_id should match created_by_admin.id",
    beforeCreatedByAdminId,
    beforeCreatedByAdminSummary.id,
  );

  // Ensure created record reflects initial payload on mutable fields
  TestValidator.equals(
    "created.title should equal initial title",
    created.title,
    initialTitle,
  );
  TestValidator.equals(
    "created.description should equal initial description",
    created.description,
    initialDescription,
  );
  TestValidator.equals(
    "created.scope_description should equal initial scope",
    created.scope_description,
    initialScope,
  );
  TestValidator.equals(
    "created.status should equal initial status",
    created.status,
    "draft",
  );
  TestValidator.equals(
    "created.external_reference should equal initial external reference",
    created.external_reference,
    initialExternalRef,
  );
  TestValidator.equals(
    "created.effective_from should equal initial effective_from",
    created.effective_from,
    initialEffectiveFrom,
  );

  // 3. Prepare update payload that changes several mutable fields
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedScope = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStatus = "active";
  const updatedExternalRef = `CASE-${RandomGenerator.alphaNumeric(10)}`;
  const updatedEffectiveFrom = new Date(Date.now() + 60_000).toISOString();

  const updateBody = {
    title: updatedTitle,
    description: updatedDescription,
    scope_description: updatedScope,
    status: updatedStatus,
    external_reference: updatedExternalRef,
    effective_from: updatedEffectiveFrom,
  } satisfies IShoppingMallLegalHold.IUpdate;

  const updated: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.update(connection, {
      legalHoldCode: created.code,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate immutable fields remain unchanged after update
  TestValidator.equals(
    "id must remain unchanged after legal hold update",
    updated.id,
    beforeId,
  );
  TestValidator.equals(
    "code must remain unchanged after legal hold update",
    updated.code,
    beforeCode,
  );
  TestValidator.equals(
    "created_at must remain unchanged after legal hold update",
    updated.created_at,
    beforeCreatedAt,
  );
  TestValidator.equals(
    "created_by_admin_id must remain unchanged after legal hold update",
    updated.created_by_admin_id,
    beforeCreatedByAdminId,
  );
  TestValidator.equals(
    "created_by_admin.id must remain unchanged after update",
    updated.created_by_admin.id,
    beforeCreatedByAdminSummary.id,
  );

  // 5. Validate updated fields reflect new values
  TestValidator.equals(
    "title must be updated to new value",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "description must be updated to new value",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "scope_description must be updated to new value",
    updated.scope_description,
    updatedScope,
  );
  TestValidator.equals(
    "status must be updated to new value",
    updated.status,
    updatedStatus,
  );
  TestValidator.equals(
    "external_reference must be updated to new value",
    updated.external_reference,
    updatedExternalRef,
  );
  TestValidator.equals(
    "effective_from must be updated to new value",
    updated.effective_from,
    updatedEffectiveFrom,
  );

  // 6. Validate updated_at is not earlier than beforeUpdatedAt
  const beforeUpdatedAtDate = new Date(beforeUpdatedAt);
  const afterUpdatedAtDate = new Date(updated.updated_at);

  TestValidator.predicate(
    "updated_at must be same or later than previous updated_at after update",
    afterUpdatedAtDate.getTime() >= beforeUpdatedAtDate.getTime(),
  );

  // 7. Optionally re-fetch the same legal hold to confirm persistence
  const reloaded: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: created.code,
    });
  typia.assert(reloaded);

  // Re-validate immutable fields
  TestValidator.equals(
    "reloaded.id must match updated.id",
    reloaded.id,
    updated.id,
  );
  TestValidator.equals(
    "reloaded.code must match updated.code",
    reloaded.code,
    updated.code,
  );
  TestValidator.equals(
    "reloaded.created_at must match updated.created_at",
    reloaded.created_at,
    updated.created_at,
  );
  TestValidator.equals(
    "reloaded.created_by_admin_id must match updated.created_by_admin_id",
    reloaded.created_by_admin_id,
    updated.created_by_admin_id,
  );
  TestValidator.equals(
    "reloaded.created_by_admin.id must match updated.created_by_admin.id",
    reloaded.created_by_admin.id,
    updated.created_by_admin.id,
  );

  // Re-validate updated fields persistence
  TestValidator.equals(
    "reloaded.title must match updated.title",
    reloaded.title,
    updated.title,
  );
  TestValidator.equals(
    "reloaded.description must match updated.description",
    reloaded.description,
    updated.description,
  );
  TestValidator.equals(
    "reloaded.scope_description must match updated.scope_description",
    reloaded.scope_description,
    updated.scope_description,
  );
  TestValidator.equals(
    "reloaded.status must match updated.status",
    reloaded.status,
    updated.status,
  );
  TestValidator.equals(
    "reloaded.external_reference must match updated.external_reference",
    reloaded.external_reference,
    updated.external_reference,
  );
  TestValidator.equals(
    "reloaded.effective_from must match updated.effective_from",
    reloaded.effective_from,
    updated.effective_from,
  );

  // Validate updated_at monotonicity between updated and reloaded
  const reloadedUpdatedAtDate = new Date(reloaded.updated_at);
  TestValidator.predicate(
    "reloaded.updated_at must be same or later than updated.updated_at",
    reloadedUpdatedAtDate.getTime() >= afterUpdatedAtDate.getTime(),
  );
}
