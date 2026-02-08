import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin (no specific fields in IJoin, so empty object)
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Generate a random UUID categoryId
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a subcategory with empty body
  const firstSubcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId },
        body: {},
      },
    );
  typia.assert(firstSubcategory);
  // 4. Attempt to create duplicate subcategory with empty body
  await TestValidator.httpError(
    "duplicate subcategory name conflict",
    409,
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
        adminConnection,
        {
          params: { categoryId },
          body: {},
        },
      );
    },
  );
}
