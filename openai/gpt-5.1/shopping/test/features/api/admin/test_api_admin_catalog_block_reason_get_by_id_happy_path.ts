import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_get_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorized context and token on connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a catalog block reason with known values
  const createBody = {
    code: `policy_violation_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 8,
    }),
    severity_level: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(created);

  // 3. Fetch the catalog block reason by its id
  const fetched: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.at(connection, {
      catalogBlockReasonId: created.id,
    });
  typia.assert<IShoppingMallCatalogBlockReason>(fetched);

  // 4. Validate identity and business fields equality
  TestValidator.equals(
    "block reason id should match between create and get-by-id",
    fetched.id,
    created.id,
  );

  TestValidator.equals(
    "block reason code should match between create and get-by-id",
    fetched.code,
    created.code,
  );

  TestValidator.equals(
    "block reason name should match between create and get-by-id",
    fetched.name,
    created.name,
  );

  TestValidator.equals(
    "block reason description should match between create and get-by-id",
    fetched.description ?? null,
    created.description ?? null,
  );

  TestValidator.equals(
    "block reason severity_level should match between create and get-by-id",
    fetched.severity_level,
    created.severity_level,
  );

  // Audit fields should be preserved and non-empty (typia.assert already checks format)
  TestValidator.equals(
    "created_at should be identical between create and get-by-id",
    fetched.created_at,
    created.created_at,
  );

  TestValidator.equals(
    "updated_at should be identical between create and get-by-id",
    fetched.updated_at,
    created.updated_at,
  );

  TestValidator.equals(
    "deleted_at should be null for a newly created active block reason",
    fetched.deleted_at ?? null,
    null,
  );
}
