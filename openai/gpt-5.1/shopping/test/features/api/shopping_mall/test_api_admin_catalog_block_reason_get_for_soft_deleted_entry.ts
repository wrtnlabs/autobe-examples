import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_get_for_soft_deleted_entry(
  connection: api.IConnection,
) {
  // 1. Register an admin via join API to obtain an authorized context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Skip ip to avoid guessing between ipv4/ipv6; backend can infer from request.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a catalog block reason as this admin.
  const severityCandidates = ["low", "medium", "high"] as const;
  const severity_level = RandomGenerator.pick(severityCandidates);

  const createBody = {
    code: `reason_${RandomGenerator.alphaNumeric(12)}`,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }),
    severity_level,
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const createdReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdReason);

  // Basic field invariants after creation
  TestValidator.equals(
    "created reason code equals request code",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created reason name equals request name",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created reason severity_level equals request severity_level",
    createdReason.severity_level,
    createBody.severity_level,
  );

  // For a freshly created record, deleted_at should be null or undefined.
  TestValidator.predicate(
    "created reason deleted_at is null or undefined",
    createdReason.deleted_at === null || createdReason.deleted_at === undefined,
  );

  // 3. Soft delete the created catalog block reason.
  await api.functional.shoppingMall.admin.catalogBlockReasons.erase(
    connection,
    {
      catalogBlockReasonId: createdReason.id,
    },
  );

  // 4. Retrieve the (soft-)deleted catalog block reason.
  const fetchedReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.at(connection, {
      catalogBlockReasonId: createdReason.id,
    });
  typia.assert(fetchedReason);

  // 5. Verify identity invariants are preserved.
  TestValidator.equals(
    "fetched reason id matches created id",
    fetchedReason.id,
    createdReason.id,
  );
  TestValidator.equals(
    "fetched reason code matches created code",
    fetchedReason.code,
    createdReason.code,
  );
  TestValidator.equals(
    "fetched reason name matches created name",
    fetchedReason.name,
    createdReason.name,
  );
  TestValidator.equals(
    "fetched reason severity_level matches created severity_level",
    fetchedReason.severity_level,
    createdReason.severity_level,
  );

  // Description should also be preserved; it is nullable/undefinable so compare directly.
  TestValidator.equals(
    "fetched reason description matches created description",
    fetchedReason.description ?? null,
    createdReason.description ?? null,
  );

  // created_at should remain the same before and after delete.
  TestValidator.equals(
    "fetched reason created_at equals created created_at",
    fetchedReason.created_at,
    createdReason.created_at,
  );

  // We do not assert updated_at equality as implementations may touch it on delete.

  // 6. Business rule check: after delete, deleted_at must be non-null.
  TestValidator.predicate(
    "fetched reason deleted_at is non-null after delete",
    fetchedReason.deleted_at !== null && fetchedReason.deleted_at !== undefined,
  );
}
