import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a catalog block reason as the authenticated admin
  const severityLevels = ["low", "medium", "high"] as const;
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    severity_level: RandomGenerator.pick(severityLevels),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(created);

  // 3. Business-level validations on the created record
  TestValidator.equals(
    "created block reason code matches request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created block reason name matches request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created block reason severity_level matches request",
    created.severity_level,
    createBody.severity_level,
  );

  TestValidator.predicate(
    "created block reason id should be a non-empty string",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should be non-empty string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at must be null or undefined right after creation",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 4. Delete the catalog block reason using its id
  await api.functional.shoppingMall.admin.catalogBlockReasons.erase(
    connection,
    {
      catalogBlockReasonId: created.id,
    },
  );

  // 5. If erase throws no error, treat as successful deletion
  TestValidator.predicate("erase completed without throwing error", true);
}
