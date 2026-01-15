import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
export async function test_api_product_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a complete product with all required fields
  const product: IShoppingMallProduct = typia.random<IShoppingMallProduct>();
  // Ensure product has valid uuid format
  TestValidator.predicate(
    "product id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      product.id,
    ),
  );
  // Ensure all required properties conform to constraints
  TestValidator.predicate(
    "product name length is valid",
    product.name.length >= 5 && product.name.length <= 255,
  );
  TestValidator.predicate(
    "product description length is valid",
    product.description.length >= 10 && product.description.length <= 10000,
  );
  TestValidator.predicate("product price is valid", product.price >= 0.01);
  TestValidator.predicate(
    "product category_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      product.category_id,
    ),
  );
  TestValidator.equals(
    "product status should be active",
    product.status,
    "active",
  );
  TestValidator.predicate(
    "product sku length is valid",
    product.sku.length >= 1 && product.sku.length <= 100,
  );
  TestValidator.predicate(
    "product primary_image_url is valid URI",
    /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\\s]*$/.test(product.primary_image_url),
  );
  // Validate optional properties are set to their defaults
  TestValidator.equals(
    "product brand_id should be undefined",
    product.brand_id,
    undefined,
  );
  TestValidator.equals(
    "product discount_percentage should be undefined",
    product.discount_percentage,
    undefined,
  );
  TestValidator.equals(
    "product inventory_count should be undefined",
    product.inventory_count,
    undefined,
  );
  TestValidator.equals(
    "product rating_average should be undefined",
    product.rating_average,
    undefined,
  );
  TestValidator.equals(
    "product reviews_count should be undefined",
    product.reviews_count,
    undefined,
  );
  TestValidator.equals(
    "product product_variants_count should be undefined",
    product.product_variants_count,
    undefined,
  );
  TestValidator.equals(
    "product views_count should be undefined",
    product.views_count,
    undefined,
  );
  TestValidator.equals(
    "product sales_count should be undefined",
    product.sales_count,
    undefined,
  );
  TestValidator.equals(
    "product is_featured should be undefined",
    product.is_featured,
    undefined,
  );
  TestValidator.equals(
    "product has_variants should be undefined",
    product.has_variants,
    undefined,
  );
  TestValidator.equals(
    "product is_new should be undefined",
    product.is_new,
    undefined,
  );
  TestValidator.equals(
    "product category_ids should be undefined",
    product.category_ids,
    undefined,
  );
  // Validate array constraints
  if (product.tags) {
    TestValidator.predicate(
      "product tags should be array",
      Array.isArray(product.tags),
    );
    TestValidator.predicate(
      "product tags length should be reasonable",
      product.tags.length <= 10,
    );
    for (const tag of product.tags) {
      TestValidator.predicate(
        "tag string length should be 1-50 characters",
        tag.length >= 1 && tag.length <= 50,
      );
    }
  }
  // Validate timestamp format
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      product.created_at,
    ),
  );
  // Verify the product has valid IShoppingMallProduct structure
  typia.assert(product);
  // Retrieve the product by its ID
  const retrievedProduct =
    await api.functional.shoppingMall.products.getByProductcode(connection, {
      productCode: product.id,
    });
  // Validate that the retrieved product matches the generated product exactly
  typia.assert(retrievedProduct);
  // Validate all properties are identical
  TestValidator.equals(
    "retrieved product id should match",
    retrievedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "retrieved product name should match",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "retrieved product description should match",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "retrieved product price should match",
    retrievedProduct.price,
    product.price,
  );
  TestValidator.equals(
    "retrieved product category_id should match",
    retrievedProduct.category_id,
    product.category_id,
  );
  TestValidator.equals(
    "retrieved product status should match",
    retrievedProduct.status,
    product.status,
  );
  TestValidator.equals(
    "retrieved product sku should match",
    retrievedProduct.sku,
    product.sku,
  );
  TestValidator.equals(
    "retrieved product primary_image_url should match",
    retrievedProduct.primary_image_url,
    product.primary_image_url,
  );
  TestValidator.equals(
    "retrieved product created_at should match",
    retrievedProduct.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "retrieved product brand_id should match",
    retrievedProduct.brand_id,
    product.brand_id,
  );
  TestValidator.equals(
    "retrieved product discount_percentage should match",
    retrievedProduct.discount_percentage,
    product.discount_percentage,
  );
  TestValidator.equals(
    "retrieved product inventory_count should match",
    retrievedProduct.inventory_count,
    product.inventory_count,
  );
  TestValidator.equals(
    "retrieved product rating_average should match",
    retrievedProduct.rating_average,
    product.rating_average,
  );
  TestValidator.equals(
    "retrieved product reviews_count should match",
    retrievedProduct.reviews_count,
    product.reviews_count,
  );
  TestValidator.equals(
    "retrieved product product_variants_count should match",
    retrievedProduct.product_variants_count,
    product.product_variants_count,
  );
  TestValidator.equals(
    "retrieved product views_count should match",
    retrievedProduct.views_count,
    product.views_count,
  );
  TestValidator.equals(
    "retrieved product sales_count should match",
    retrievedProduct.sales_count,
    product.sales_count,
  );
  TestValidator.equals(
    "retrieved product is_featured should match",
    retrievedProduct.is_featured,
    product.is_featured,
  );
  TestValidator.equals(
    "retrieved product has_variants should match",
    retrievedProduct.has_variants,
    product.has_variants,
  );
  TestValidator.equals(
    "retrieved product is_new should match",
    retrievedProduct.is_new,
    product.is_new,
  );
  TestValidator.equals(
    "retrieved product category_ids should match",
    retrievedProduct.category_ids,
    product.category_ids,
  );
  // Validate tags array
  if (product.tags) {
    TestValidator.equals(
      "retrieved product tags should match",
      retrievedProduct.tags?.length,
      product.tags?.length,
    );
    if (retrievedProduct.tags && product.tags) {
      for (let i = 0; i < product.tags.length; i++) {
        TestValidator.equals(
          "retrieved product tag ${i} should match",
          retrievedProduct.tags[i],
          product.tags[i],
        );
      }
    }
  } else {
    TestValidator.equals(
      "retrieved product tags should be null when original is null",
      retrievedProduct.tags,
      product.tags,
    );
  }
}
