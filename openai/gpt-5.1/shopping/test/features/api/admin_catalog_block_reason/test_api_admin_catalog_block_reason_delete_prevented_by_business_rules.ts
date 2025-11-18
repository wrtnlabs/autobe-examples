import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Verify that deleting a catalog block reason is prevented by business rules.
 *
 * This test exercises the admin governance workflow around catalog block
 * reasons. It ensures that an authenticated admin cannot simply hard-delete a
 * block reason record via the DELETE
 * /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} endpoint when
 * domain rules prevent its removal.
 *
 * Scenario (adapted for available APIs):
 *
 * 1. Register an admin via POST /auth/admin/join using
 *    IShoppingMallAdminJoin.ICreate. The SDK automatically injects the access
 *    token into the shared connection, so subsequent admin endpoints are
 *    authenticated.
 * 2. As this admin, create a catalog block reason via POST
 *    /shoppingMall/admin/catalogBlockReasons with
 *    IShoppingMallCatalogBlockReason.ICreate, using a code like "legal_request"
 *    and a high severity level such as "high" for realistic governance data.
 * 3. Attempt to delete the catalog block reason by calling DELETE
 *    /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} through
 *    api.functional.shoppingMall.admin.catalogBlockReasons.erase.
 * 4. Validate that the delete operation does not succeed and instead throws an
 *    error, which we treat as the enforcement of domain rules preventing
 *    hard-deletion (for example, because the reason is referenced or otherwise
 *    governance-critical in the environment).
 *
 * Because our test harness cannot directly control or inspect the underlying
 * referential usage of the reason (no additional linkage APIs are exposed
 * here), we design this test as a pure negative-path assertion: the important
 * outcome is that an authenticated admin receives an error when attempting to
 * delete the configured reason, rather than a silent success.
 */
export async function test_api_admin_catalog_block_reason_delete_prevented_by_business_rules(
  connection: api.IConnection,
) {
  // 1. Admin join (auto-auth via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a catalog block reason as this admin
  const createBody = {
    code: `legal_request_${RandomGenerator.alphaNumeric(8)}`,
    name: "Legal request block reason",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: "high",
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Try to delete the created reason and assert that the call fails.
  //    We do not check specific HTTP status codes; we only require that some
  //    error is thrown, representing business rule enforcement.
  await TestValidator.error(
    "catalog block reason deletion must be prevented by business rules",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.erase(
        connection,
        {
          catalogBlockReasonId: created.id,
        },
      );
    },
  );
}
