import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

export async function test_api_admin_catalog_block_reason_get_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Try to access the protected endpoint without any admin authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "unauthenticated GET on catalogBlockReasons.at must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.at(
        unauthConn,
        {
          catalogBlockReasonId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 2. Perform admin join to establish authenticated admin context
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

  // Sanity check that token is present and non-empty
  TestValidator.predicate(
    "admin join must issue a non-empty access token",
    () => authorizedAdmin.token.access.length > 0,
  );

  // 3. Create a new catalog block reason as the authenticated admin
  const severityLevels = ["low", "medium", "high"] as const;

  const createBody = {
    code: `policy_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    severity_level: RandomGenerator.pick(severityLevels),
  } satisfies IShoppingMallCatalogBlockReason.ICreate;

  const createdReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCatalogBlockReason>(createdReason);

  // Validate that core fields round-trip correctly from create request
  TestValidator.equals(
    "created block reason code must match request payload",
    createdReason.code,
    createBody.code,
  );
  TestValidator.equals(
    "created block reason name must match request payload",
    createdReason.name,
    createBody.name,
  );
  TestValidator.equals(
    "created block reason severity_level must match request payload",
    createdReason.severity_level,
    createBody.severity_level,
  );
  TestValidator.equals(
    "created block reason description must match request payload",
    createdReason.description ?? null,
    createBody.description ?? null,
  );

  // 4. Fetch the same catalog block reason by id with authenticated admin
  const fetchedReason: IShoppingMallCatalogBlockReason =
    await api.functional.shoppingMall.admin.catalogBlockReasons.at(connection, {
      catalogBlockReasonId: createdReason.id,
    });
  typia.assert<IShoppingMallCatalogBlockReason>(fetchedReason);

  // Validate id and core business fields are consistent between create and get
  TestValidator.equals(
    "fetched block reason id must equal created reason id",
    fetchedReason.id,
    createdReason.id,
  );
  TestValidator.equals(
    "fetched block reason code must equal created reason code",
    fetchedReason.code,
    createdReason.code,
  );
  TestValidator.equals(
    "fetched block reason name must equal created reason name",
    fetchedReason.name,
    createdReason.name,
  );
  TestValidator.equals(
    "fetched block reason severity_level must equal created reason severity_level",
    fetchedReason.severity_level,
    createdReason.severity_level,
  );
  TestValidator.equals(
    "fetched block reason description must equal created reason description",
    fetchedReason.description ?? null,
    createdReason.description ?? null,
  );
}
