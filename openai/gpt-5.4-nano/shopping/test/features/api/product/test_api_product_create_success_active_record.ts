import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_create_success_active_record(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const categoryConnection: api.IConnection = { host: connection.host };
  categoryConnection.headers = adminConnection.headers;
  const category = await api.functional.shoppingMall.admin.categories.create(
    categoryConnection,
    {
      body: {
        parent_category_id: undefined,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        slug: `${RandomGenerator.alphabets(12)}-${Date.now()}`,
        visibility: "public",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IShoppingMallMember.IJoin,
  });
  const created =
    await api.functional.shoppingMall.member.products.createProduct(
      memberConnection,
      {
        body: {
          shopping_mall_category_id: category.id,
          code: `code-${RandomGenerator.alphabets(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_featured: typia.random<boolean>(),
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "seller id matches authenticated member",
    created.shopping_mall_seller_id,
    member.id,
  );
  TestValidator.equals(
    "category id matches",
    created.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals("active product deleted_at", created.deleted_at, null);
  const createdAtMs = new Date(created.created_at).getTime();
  const updatedAtMs = new Date(created.updated_at).getTime();
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedAtMs >= createdAtMs,
  );
}
