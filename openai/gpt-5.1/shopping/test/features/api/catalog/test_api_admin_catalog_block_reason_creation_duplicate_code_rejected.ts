import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Verify that creating a catalog block reason with a duplicate `code` is
 * rejected.
 *
 * Business goal
 *
 * - Ensure the `code` field of IShoppingMallCatalogBlockReason.ICreate is
 *   globally unique.
 * - Confirm that the application enforces the unique index on `code` and surfaces
 *   a business-level error when an admin attempts to re-use an existing code.
 *
 * High level steps
 *
 * 1. Register a new admin using POST /auth/admin/join, which also authenticates
 *    the connection.
 * 2. As this admin, call POST /shoppingMall/admin/catalogBlockReasons with a
 *    concrete IShoppingMallCatalogBlockReason.ICreate payload using some
 *    deterministic `code`.
 *
 *    - Expect success.
 *    - Assert the response type with typia.assert.
 * 3. With the same authenticated admin connection, call POST
 *    /shoppingMall/admin/catalogBlockReasons again with another
 *    IShoppingMallCatalogBlockReason.ICreate payload that uses the _same_
 *    `code`, but different `name`, `description`, or `severity_level`.
 *
 *    - Wrap this call in TestValidator.error to assert that it fails due to a
 *         uniqueness violation.
 *    - Do not assert specific HTTP status codes or error payload structure; only
 *         that an error occurs.
 * 4. Rely on the absence of a listing API and the TestValidator.error assertion to
 *    conclude that only the first creation succeeded and the second was
 *    rejected.
 *
 * DTO usage
 *
 * - Admin registration body must satisfy IShoppingMallAdminJoin.ICreate:
 *
 *   - Email: unique email address (Format<"email">)
 *   - Password: string & Format<"password">
 *   - Ip?: ipv4/ipv6 or null/undefined (we can omit or pass null)
 *   - Href: string & Format<"uri">
 *   - Referrer: string & Format<"uri">
 * - Catalog block reason creation body must satisfy
 *   IShoppingMallCatalogBlockReason.ICreate:
 *
 *   - Code: string (same across both create attempts)
 *   - Name: string
 *   - Description?: string | null | undefined
 *   - Severity_level: string (e.g., "low", "medium", "high")
 *
 * Assertions
 *
 * - Typia.assert on the successful IShoppingMallCatalogBlockReason response for
 *   the first create.
 * - TestValidator.error with a descriptive title for the duplicate-code second
 *   create call.
 */
export async function test_api_admin_catalog_block_reason_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context.
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
  typia.assert(adminAuthorized);

  // 2. Create an initial catalog block reason with a specific `code`.
  const duplicateCode = RandomGenerator.alphaNumeric(12);

  const firstCreateBody = {
    code: duplicateCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    severity_level: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const firstReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstReason);

  // 3. Attempt to create another catalog block reason with the same `code`.
  const secondCreateBody = {
    code: duplicateCode, // same code to trigger unique constraint
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  await TestValidator.error(
    "creating catalog block reason with duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
