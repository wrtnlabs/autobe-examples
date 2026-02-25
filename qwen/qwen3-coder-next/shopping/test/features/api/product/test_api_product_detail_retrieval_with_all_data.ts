import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_product_detail_retrieval_with_all_data(
  connection: api.IConnection,
): Promise<void> {
  // Use simulated data that matches the expected IShoppingMallProduct structure
  const mockProduct = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_deleted: false,
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 1 }) as string | null,
      parent: null,
      subcategory_count: 0,
    },
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      shop_name: RandomGenerator.name(),
      approval_status: "approved",
      created_at: new Date().toISOString(),
    },
    images: ArrayUtil.repeat(3, (i) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      image_url: `https://example.com/image${i}.jpg` as string &
        tags.Format<"uri">,
      sort_order: i,
    })),
    variants: ArrayUtil.repeat(2, () => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      shoppingMallProductId: typia.random<string & tags.Format<"uuid">>(),
      skuCode: RandomGenerator.alphaNumeric(8),
      priceOverride: null,
      stockQuantity: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
      optionValues: [RandomGenerator.name(1), RandomGenerator.name(1)],
      product: {
        id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.name(2),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_deleted: false,
        seller: {
          id: typia.random<string & tags.Format<"uuid">>(),
          shop_name: RandomGenerator.name(),
          approval_status: "approved",
          created_at: new Date().toISOString(),
        },
        category: {
          id: typia.random<string & tags.Format<"uuid">>(),
          name: RandomGenerator.name(2),
          description: null,
          parent: null,
          subcategory_count: 0,
        },
        average_rating: 4,
      },
    })),
  } satisfies IShoppingMallProduct;
  // Test product detail retrieval with the mock data
  const retrieved = await api.functional.shoppingMall.products.at(connection, {
    productId: mockProduct.id,
  });
  typia.assert(retrieved);
  // Verify core product information
  TestValidator.equals(
    "product name matches",
    retrieved.name,
    mockProduct.name,
  );
  TestValidator.equals(
    "description matches",
    retrieved.description,
    mockProduct.description,
  );
  TestValidator.equals(
    "base_price matches",
    retrieved.base_price,
    mockProduct.base_price,
  );
  TestValidator.equals(
    "is_deleted matches",
    retrieved.is_deleted,
    mockProduct.is_deleted,
  );
  // Verify category information
  TestValidator.equals(
    "category id matches",
    retrieved.category.id,
    mockProduct.category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrieved.category.name,
    mockProduct.category.name,
  );
  // Verify seller information
  TestValidator.equals(
    "seller id matches",
    retrieved.seller.id,
    mockProduct.seller.id,
  );
  TestValidator.equals(
    "seller shop name matches",
    retrieved.seller.shop_name,
    mockProduct.seller.shop_name,
  );
  TestValidator.equals(
    "seller approval status",
    retrieved.seller.approval_status,
    "approved",
  );
  // Verify images are returned and sorted correctly
  TestValidator.equals(
    "image count",
    retrieved.images.length,
    mockProduct.images.length,
  );
  for (let i = 0; i < retrieved.images.length - 1; i++) {
    TestValidator.predicate(
      "images sorted by order",
      retrieved.images[i].sort_order < retrieved.images[i + 1].sort_order,
    );
  }
  // Verify product variants
  TestValidator.equals(
    "variant count",
    retrieved.variants.length,
    mockProduct.variants.length,
  );
  retrieved.variants.forEach((variant) => {
    TestValidator.predicate(
      "has valid sku code",
      typeof variant.skuCode === "string" && variant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "stock quantity is valid",
      variant.stockQuantity >= 0,
    );
    TestValidator.predicate(
      "option values is array",
      Array.isArray(variant.optionValues) && variant.optionValues.length > 0,
    );
  });
}
