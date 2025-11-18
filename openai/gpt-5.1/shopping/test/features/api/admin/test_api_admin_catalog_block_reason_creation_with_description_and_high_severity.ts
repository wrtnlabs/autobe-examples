import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_creation_with_description_and_high_severity(
  connection: api.IConnection,
) {
  // 1. Arrange: create an admin via join to establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Act: create a catalog block reason with explicit description and high severity
  const createBody = {
    code: "counterfeit_suspected",
    name: "Counterfeit suspected",
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const createdReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(createdReason);

  // 3. Assert: field echoing and business expectations
  TestValidator.equals(
    "created block reason code echoes request payload",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created block reason name echoes request payload",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created block reason description echoes request payload",
    createdReason.description,
    createBody.description,
  );
  TestValidator.equals(
    "created block reason severity_level echoes request payload (high)",
    createdReason.severity_level,
    createBody.severity_level,
  );

  // deleted_at should be null or undefined for a newly created active reason
  TestValidator.predicate(
    "newly created catalog block reason has no deleted_at (null or undefined)",
    createdReason.deleted_at === null || createdReason.deleted_at === undefined,
  );

  // created_at and updated_at are validated structurally by typia.assert already;
  // we only check that updated_at is not earlier than created_at as a simple
  // temporal sanity check consistent with business expectations.
  const createdAt = new Date(createdReason.created_at).getTime();
  const updatedAt = new Date(createdReason.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is greater than or equal to created_at for created block reason",
    updatedAt >= createdAt,
  );
}
