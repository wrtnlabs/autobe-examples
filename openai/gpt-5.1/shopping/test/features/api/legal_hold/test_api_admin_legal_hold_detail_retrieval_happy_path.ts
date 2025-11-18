import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

export async function test_api_admin_legal_hold_detail_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context (token is handled by SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive from request metadata
    ip: undefined,
    href: "https://admin.shoppingmall.test/join", // any valid uri
    referrer: "https://shoppingmall.test/landing", // any valid uri
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new legal hold with a unique code and realistic metadata
  const legalHoldCode = `LH-${RandomGenerator.alphaNumeric(12)}`;

  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "active",
    scope_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(8)}`,
    effective_from: nowIso,
  } satisfies IShoppingMallLegalHold.ICreate;

  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallLegalHold>(created);

  // Basic sanity checks linking legal hold to the creating admin
  TestValidator.equals(
    "created_by_admin_id should match authorized admin id",
    created.created_by_admin_id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "created_by_admin summary id should match admin id",
    created.created_by_admin.id,
    authorizedAdmin.id,
  );

  // 3. Retrieve the same legal hold by its business code
  const retrievedOnce: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: legalHoldCode,
    });
  typia.assert<IShoppingMallLegalHold>(retrievedOnce);

  // 4. Validate that retrieved data matches the created data for core fields
  TestValidator.equals(
    "retrieved code must equal requested legalHoldCode",
    retrievedOnce.code,
    legalHoldCode,
  );

  TestValidator.equals(
    "retrieved id must equal created id",
    retrievedOnce.id,
    created.id,
  );

  TestValidator.equals(
    "retrieved title must equal created title",
    retrievedOnce.title,
    created.title,
  );

  TestValidator.equals(
    "retrieved status must equal created status",
    retrievedOnce.status,
    created.status,
  );

  TestValidator.equals(
    "retrieved description must equal created description",
    retrievedOnce.description ?? null,
    created.description ?? null,
  );

  TestValidator.equals(
    "retrieved scope_description must equal created scope_description",
    retrievedOnce.scope_description ?? null,
    created.scope_description ?? null,
  );

  TestValidator.equals(
    "retrieved external_reference must equal created external_reference",
    retrievedOnce.external_reference ?? null,
    created.external_reference ?? null,
  );

  TestValidator.equals(
    "retrieved effective_from must equal created effective_from",
    retrievedOnce.effective_from ?? null,
    created.effective_from ?? null,
  );

  TestValidator.equals(
    "retrieved released_at must equal created released_at",
    retrievedOnce.released_at ?? null,
    created.released_at ?? null,
  );

  TestValidator.equals(
    "retrieved created_at must equal created created_at",
    retrievedOnce.created_at,
    created.created_at,
  );

  TestValidator.equals(
    "retrieved updated_at must equal created updated_at",
    retrievedOnce.updated_at,
    created.updated_at,
  );

  TestValidator.equals(
    "retrieved deleted_at must equal created deleted_at",
    retrievedOnce.deleted_at ?? null,
    created.deleted_at ?? null,
  );

  TestValidator.equals(
    "retrieved created_by_admin_id must equal created created_by_admin_id",
    retrievedOnce.created_by_admin_id,
    created.created_by_admin_id,
  );

  TestValidator.equals(
    "retrieved released_by_admin_id must equal created released_by_admin_id",
    retrievedOnce.released_by_admin_id ?? null,
    created.released_by_admin_id ?? null,
  );

  TestValidator.equals(
    "retrieved created_by_admin summary must equal created created_by_admin summary",
    retrievedOnce.created_by_admin,
    created.created_by_admin,
  );

  TestValidator.equals(
    "retrieved released_by_admin summary must equal created released_by_admin summary",
    retrievedOnce.released_by_admin ?? null,
    created.released_by_admin ?? null,
  );

  // 5. Call GET twice to ensure read-only, idempotent behavior
  const retrievedTwice: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.at(connection, {
      legalHoldCode: legalHoldCode,
    });
  typia.assert<IShoppingMallLegalHold>(retrievedTwice);

  TestValidator.equals(
    "second retrieval must be deeply equal to first retrieval, confirming read-only behavior",
    retrievedTwice,
    retrievedOnce,
  );
}
