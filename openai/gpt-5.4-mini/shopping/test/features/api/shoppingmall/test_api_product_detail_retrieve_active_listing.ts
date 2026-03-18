import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_retrieve_active_listing(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const product = await api.functional.shoppingMall.products.at(
    actorConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(product);
  TestValidator.predicate("product has uuid id", product.id.length > 0);
  TestValidator.predicate("product name is present", product.name.length > 0);
  TestValidator.predicate(
    "product description is present",
    product.description.length > 0,
  );
  TestValidator.predicate(
    "base price is finite",
    Number.isFinite(product.basePrice),
  );
  TestValidator.predicate("seller summary exists", product.seller !== null);
  TestValidator.predicate(
    "category is either null or populated",
    product.category === null || product.category !== undefined,
  );
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(product.variants),
  );
  TestValidator.predicate("images array exists", Array.isArray(product.images));
  TestValidator.predicate("createdAt is present", product.createdAt.length > 0);
  TestValidator.predicate("updatedAt is present", product.updatedAt.length > 0);
  TestValidator.equals(
    "active product deletedAt is null",
    product.deletedAt,
    null,
  );
}
