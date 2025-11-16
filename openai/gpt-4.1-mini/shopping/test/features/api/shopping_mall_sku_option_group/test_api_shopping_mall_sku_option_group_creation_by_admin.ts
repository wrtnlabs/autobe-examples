import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOptionGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOptionGroup";

export async function test_api_shopping_mall_sku_option_group_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers (join) via /auth/admin/join
  const email: string = `admin+${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const adminCreateBody = {
    email,
    name: `Admin ${RandomGenerator.name(2)}`,
    password: "strongAdminPass123!",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Admin creates a new SKU Option Group with unique code and name
  const code = `code-${typia.random<string & tags.Format<"uuid">>()}`;
  const createBody = {
    code,
    name: `SKU Option Group ${RandomGenerator.name(2)}`,
    // description omitted to test optional
  } satisfies IShoppingMallSkuOptionGroup.ICreate;

  const skuOptionGroup: IShoppingMallSkuOptionGroup =
    await api.functional.shoppingMall.admin.shoppingMallSkuOptionGroups.create(
      connection,
      { body: createBody },
    );
  typia.assert(skuOptionGroup);

  // 3. Verify returned SKU Option Group properties
  TestValidator.equals(
    "SKU Option Group code matches",
    skuOptionGroup.code,
    code,
  );
  TestValidator.predicate(
    "SKU Option Group created_at is ISO string",
    typeof skuOptionGroup.created_at === "string" &&
      skuOptionGroup.created_at.length > 0,
  );
  // updated_at is optional and can be null or string
  TestValidator.predicate(
    "SKU Option Group updated_at is string or null or undefined",
    skuOptionGroup.updated_at === null ||
      skuOptionGroup.updated_at === undefined ||
      typeof skuOptionGroup.updated_at === "string",
  );
}
