import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_sku_inventory_state_creation_with_non_purchasable_flag(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a non-purchasable SKU inventory state as this admin
  const code = `blocked_for_compliance_${RandomGenerator.alphaNumeric(8)}`;
  const name = "Blocked for compliance - non purchasable";
  const description = RandomGenerator.paragraph({
    sentences: 8,
    wordMin: 4,
    wordMax: 10,
  });

  const createBody = {
    code,
    name,
    description,
    is_purchasable: false,
  } satisfies IShoppingMallSkuInventoryState.ICreate;

  const createdState =
    await api.functional.shoppingMall.admin.skuInventoryStates.create(
      connection,
      {
        body: createBody,
      },
    );

  typia.assert<IShoppingMallSkuInventoryState>(createdState);

  // 3. Business assertions on response semantics
  TestValidator.equals(
    "created inventory state should echo requested code",
    createdState.code,
    code,
  );

  TestValidator.equals(
    "created inventory state should echo requested name",
    createdState.name,
    name,
  );

  TestValidator.equals(
    "created inventory state should echo requested description",
    createdState.description,
    description,
  );

  TestValidator.equals(
    "created inventory state must be non-purchasable (is_purchasable=false)",
    createdState.is_purchasable,
    false,
  );

  TestValidator.equals(
    "deleted_at must be null or undefined for newly created state",
    createdState.deleted_at ?? null,
    null,
  );
}
