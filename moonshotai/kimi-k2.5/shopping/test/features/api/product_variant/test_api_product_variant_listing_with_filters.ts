import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test product variant listing with filters.
 * Verifies that the variant listing endpoint correctly applies filters
 * for option values (color, size) and availability, with sorting and pagination.
 */
export async function test_api_product_variant_listing_with_filters(
  connection: api.IConnection,
) {
  // 1. Admin authentication for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Create base product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        categoryId: category.id,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create product variants with different colors and sizes
  const sizes = ["S", "M", "L"] as const;
  const colors = ["Red", "Blue", "Green"] as const;
  const variants: IEcommerceMallProductVariant[] = [];
  for (const size of sizes) {
    for (const color of colors) {
      const variant =
        await generate_random_ecommerce_mall_seller_products_variants_create(
          sellerConnection,
          {
            params: { productId: product.id },
            body: {
              skuCode: `${size}-${color}-${RandomGenerator.alphabets(4)}`,
              options: [
                {
                  optionName: "size",
                  optionValue: size,
                } satisfies IEcommerceMallProductVariantOption.ICreate,
                {
                  optionName: "color",
                  optionValue: color,
                } satisfies IEcommerceMallProductVariantOption.ICreate,
              ],
              price: typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<10> &
                  tags.Maximum<500>
              >(),
              stock:
                Math.random() > 0.3
                  ? typia.random<
                      number &
                        tags.Type<"uint32"> &
                        tags.Minimum<1> &
                        tags.Maximum<100>
                    >()
                  : 0,
            } satisfies IEcommerceMallProductVariant.ICreate,
          },
        );
      typia.assert(variant);
      variants.push(variant);
    }
  }
  // Public connection for listing (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  // 6. Test: List all variants without filters
  const allVariants =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "createdAt",
          order: "asc",
          optionFilters: {},
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariants);
  TestValidator.equals("all variants count", allVariants.data.length, 9);
  // 7. Test: Filter by color "Red"
  const redVariants =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "createdAt",
          order: "asc",
          optionFilters: { color: "Red" },
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(redVariants);
  TestValidator.equals("red variants count", redVariants.data.length, 3);
  TestValidator.predicate(
    "all red variants",
    redVariants.data.every((v: IEcommerceMallProductVariant.ISummary) =>
      v.options.some(
        (o) => o.optionName === "color" && o.optionValue === "Red",
      ),
    ),
  );
  // 8. Test: Filter by size "M"
  const sizeMVariants =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "createdAt",
          order: "asc",
          optionFilters: { size: "M" },
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(sizeMVariants);
  TestValidator.equals("size M variants count", sizeMVariants.data.length, 3);
  TestValidator.predicate(
    "all size M variants",
    sizeMVariants.data.every((v: IEcommerceMallProductVariant.ISummary) =>
      v.options.some((o) => o.optionName === "size" && o.optionValue === "M"),
    ),
  );
  // 9. Test: Filter by availability (isAvailable = true)
  const availableVariants =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "createdAt",
          order: "asc",
          optionFilters: {},
          isAvailable: true,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(availableVariants);
  TestValidator.predicate(
    "all available variants",
    availableVariants.data.every(
      (v: IEcommerceMallProductVariant.ISummary) => v.isAvailable,
    ),
  );
  // 10. Test: Combined filters (color = Red AND size = M)
  const combinedVariants =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "createdAt",
          order: "asc",
          optionFilters: { color: "Red", size: "M" },
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(combinedVariants);
  TestValidator.equals(
    "combined filter count",
    combinedVariants.data.length,
    1,
  );
  // 11. Test: Pagination with limit
  const limitedPage =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 5,
          sort: "createdAt",
          order: "asc",
          optionFilters: {},
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals("limited count", limitedPage.data.length <= 5, true);
  // 12. Test: Sort by price ascending
  const sortedByPrice =
    await api.functional.ecommerceMall.products.variants.index(
      publicConnection,
      {
        productId: product.id,
        body: {
          cursor: null,
          limit: 20,
          sort: "price",
          order: "asc",
          optionFilters: {},
          isAvailable: false,
          minPrice: null,
          maxPrice: null,
          page: null,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(sortedByPrice);
  for (let i = 1; i < sortedByPrice.data.length; i++) {
    const prevPrice = sortedByPrice.data[i - 1].price ?? product.basePrice;
    const currPrice = sortedByPrice.data[i].price ?? product.basePrice;
    TestValidator.predicate(
      `price[${i}] >= price[${i - 1}]`,
      currPrice >= prevPrice,
    );
  }
}
