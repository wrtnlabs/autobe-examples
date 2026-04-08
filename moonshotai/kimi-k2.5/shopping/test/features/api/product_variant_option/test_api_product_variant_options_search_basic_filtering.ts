import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_options_search_basic_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup: Create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 3. Create variant with multiple options
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          price: typia.random<number & tags.Type<"uint32">>() satisfies number as number,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
            { optionName: "Material", optionValue: "Cotton" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Search for all options of this variant
  const result =
    await api.functional.ecommerceMall.products.variants.options.index(
      sellerConnection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          limit: 10,
        } satisfies IEcommerceMallProductVariantOption.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate pagination structure
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.equals("pagination records", result.pagination.records, 3);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  // 6. Validate data contains all created options
  TestValidator.equals("data count", result.data.length, 3);
  const colorOption = result.data.find((o) => o.optionName === "Color");
  TestValidator.predicate(
    "color option exists",
    () => colorOption !== undefined,
  );
  typia.assertGuard(colorOption!);
  TestValidator.equals("color value", colorOption.optionValue, "Red");
  const sizeOption = result.data.find((o) => o.optionName === "Size");
  TestValidator.predicate("size option exists", () => sizeOption !== undefined);
  typia.assertGuard(sizeOption!);
  TestValidator.equals("size value", sizeOption.optionValue, "Large");
  const materialOption = result.data.find((o) => o.optionName === "Material");
  TestValidator.predicate(
    "material option exists",
    () => materialOption !== undefined,
  );
  typia.assertGuard(materialOption!);
  TestValidator.equals("material value", materialOption.optionValue, "Cotton");
}