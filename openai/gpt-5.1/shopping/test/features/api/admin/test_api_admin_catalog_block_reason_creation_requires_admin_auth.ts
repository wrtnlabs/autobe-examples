import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic catalog block reason creation payload
  const createBody = {
    code: `policy_violation_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  // 2. Attempt creation without authentication: should fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated catalog block reason creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.create(
        unauthConnection,
        {
          body: createBody,
        },
      );
    },
  );

  // 3. Join as admin to obtain Authorization header on the original connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Now creation should succeed with admin-authenticated connection
  const created: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Business validations: response should echo input fields
  TestValidator.equals(
    "created catalog block reason code matches input",
    created.code,
    createBody.code,
  );

  TestValidator.equals(
    "created catalog block reason name matches input",
    created.name,
    createBody.name,
  );

  TestValidator.equals(
    "created catalog block reason severity_level matches input",
    created.severity_level,
    createBody.severity_level,
  );
}
