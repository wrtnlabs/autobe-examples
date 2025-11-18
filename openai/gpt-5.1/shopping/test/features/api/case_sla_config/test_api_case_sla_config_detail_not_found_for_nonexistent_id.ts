import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate that requesting a case SLA configuration detail with a non-existent
 * identifier fails while still enforcing admin-only access.
 *
 * Business goals:
 *
 * 1. Ensure POST /auth/admin/join establishes an authenticated admin context that
 *    the SDK reflects through the shared connection.
 * 2. Verify that GET /shoppingMall/admin/caseSlaConfigs/{caseSlaConfigId} does not
 *    succeed when provided with a syntactically valid but non-existent UUID.
 * 3. Confirm that the same endpoint cannot be accessed without admin
 *    authentication (missing Authorization header), even when the ID does not
 *    exist.
 *
 * Steps:
 *
 * 1. Register an admin via api.functional.auth.admin.join, asserting the returned
 *    IShoppingMallAdmin.IAuthorized payload.
 * 2. Generate a random UUID that we treat as a non-existent caseSlaConfigId.
 * 3. Call api.functional.shoppingMall.admin.caseSlaConfigs.at with this UUID under
 *    the authenticated admin connection and assert that it throws.
 * 4. Derive an unauthenticated connection with empty headers and call the same
 *    endpoint with another random UUID, asserting that it also throws due to
 *    missing authentication.
 */
export async function test_api_case_sla_config_detail_not_found_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
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

  // 2. Prepare a random UUID we assume does not correspond to any SLA config
  const nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Authenticated call with non-existent ID must fail
  await TestValidator.error(
    "non-existent case SLA config id should cause error for authenticated admin",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaConfigs.at(connection, {
        caseSlaConfigId: nonexistentId,
      });
    },
  );

  // 4. Unauthenticated connection: missing Authorization must also fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const anotherNonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "unauthenticated access to case SLA config detail must fail",
    async () => {
      await api.functional.shoppingMall.admin.caseSlaConfigs.at(
        unauthConnection,
        {
          caseSlaConfigId: anotherNonexistentId,
        },
      );
    },
  );
}
