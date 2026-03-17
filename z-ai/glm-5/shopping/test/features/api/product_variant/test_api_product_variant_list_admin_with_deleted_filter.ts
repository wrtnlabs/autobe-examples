import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_variant_list_admin_with_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Create category as administrator
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(category);
  // 4. Create product as seller
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<number>(),
        },
      },
    );
  typia.assert(product);
  // 5. Test administrator viewing variants with includeDeleted=true (admin-only feature)
  const variantsWithDeleted =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {
        includeDeleted: true,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsWithDeleted);
  // 6. Verify pagination structure
  TestValidator.predicate("pagination structure valid", () => {
    const pagination = variantsWithDeleted.pagination;
    return (
      pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });
  // 7. Test regular filtering (includeDeleted=false)
  const variantsWithoutDeleted =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {
        includeDeleted: false,
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsWithoutDeleted);
  // 8. Test without includeDeleted parameter (should default to false)
  const variantsDefault =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {} satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsDefault);
  // 9. Test pagination parameters
  const variantsPaginated =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        direction: "desc",
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsPaginated);
  // 10. Test sorting by sku_code
  const variantsSortedBySku =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {
        sort: "sku_code",
        direction: "asc",
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsSortedBySku);
  // 11. Test sorting by price
  const variantsSortedByPrice =
    await api.functional.shoppingMall.products.variants.index(adminConnection, {
      productId: product.id,
      body: {
        sort: "price",
        direction: "asc",
      } satisfies IShoppingMallProductVariant.IRequest,
    });
  typia.assert(variantsSortedByPrice);
  // 12. Verify administrator can access cross-seller products (admin privilege)
  TestValidator.predicate("admin can view any product variants", () => {
    return (
      variantsWithDeleted.data !== undefined &&
      Array.isArray(variantsWithDeleted.data)
    );
  });
  // 13. Verify variant summary structure if variants exist
  if (variantsWithDeleted.data.length > 0) {
    const variant = variantsWithDeleted.data[0];
    TestValidator.predicate("variant has required fields", () => {
      return (
        typeof variant.id === "string" &&
        typeof variant.skuCode === "string" &&
        typeof variant.optionValues === "object" &&
        typeof variant.stockQuantity === "number" &&
        typeof variant.createdAt === "string"
      );
    });
  }
}
