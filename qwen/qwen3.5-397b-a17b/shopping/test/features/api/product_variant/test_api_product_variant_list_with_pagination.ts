import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create 5 variants for the product
  const variantCount = 5;
  const createdVariants: IShoppingMallProductVariant[] = [];
  for (let i = 0; i < variantCount; i++) {
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${i}`,
            price_override: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
            option_value_ids: [],
          } satisfies IShoppingMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    createdVariants.push(variant);
  }
  // 4. Request first page of variants (page=1, limit=3)
  const page1Response =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 3,
          sort_field: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(page1Response);
  // 5. Verify pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 3);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    variantCount,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 2);
  TestValidator.equals("page 1 data length", page1Response.data.length, 3);
  // 6. Verify each variant has required fields
  for (const variant of page1Response.data) {
    TestValidator.predicate("variant has id", variant.id !== undefined);
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant has price_override",
      variant.price_override !== undefined,
    );
    TestValidator.predicate(
      "variant has product",
      variant.product !== undefined,
    );
    TestValidator.predicate(
      "variant has created_at",
      variant.created_at !== undefined,
    );
  }
  // 7. Request second page of variants
  const page2Response =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 3,
          sort_field: "created_at",
          sort_direction: "desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 3);
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    variantCount,
  );
  TestValidator.equals("page 2 total pages", page2Response.pagination.pages, 2);
  TestValidator.equals("page 2 data length", page2Response.data.length, 2);
  // 8. Verify different variants are returned on each page
  const page1Ids = page1Response.data.map((v) => v.id);
  const page2Ids = page2Response.data.map((v) => v.id);
  for (const page1Id of page1Ids) {
    TestValidator.predicate(
      "page 2 does not contain page 1 variants",
      !page2Ids.includes(page1Id),
    );
  }
  // 9. Verify all variants across both pages equal total created
  const allReturnedIds = [...page1Ids, ...page2Ids];
  TestValidator.equals(
    "total variants returned equals created",
    allReturnedIds.length,
    variantCount,
  );
  // 10. Verify sorting by created_at descending (newest first)
  for (let i = 1; i < page1Response.data.length; i++) {
    const prevDate = new Date(page1Response.data[i - 1].created_at).getTime();
    const currDate = new Date(page1Response.data[i].created_at).getTime();
    TestValidator.predicate(
      "variants sorted by created_at desc",
      prevDate >= currDate,
    );
  }
}