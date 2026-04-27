import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_seller_category_retrieval_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Administrator creates a top-level category
  const categoryName = "Electronics";
  const categoryDescription = "Electronic devices and accessories";
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          parent_id: null,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IECommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  // 4. Seller retrieves the category by its UUID
  const retrieved = await api.functional.eCommerceMall.seller.categories.at(
    sellerConnection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate response business logic fields
  TestValidator.equals("category id", retrieved.id, category.id);
  TestValidator.equals("category name", retrieved.name, categoryName);
  TestValidator.equals(
    "category description",
    retrieved.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    retrieved.parent,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    retrieved.deleted_at,
    null,
  );
}
