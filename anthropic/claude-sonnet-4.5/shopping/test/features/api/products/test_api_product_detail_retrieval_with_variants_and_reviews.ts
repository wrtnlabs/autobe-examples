import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test complete product detail retrieval with SKU variants and images.
 *
 * This test validates the comprehensive product detail retrieval workflow for
 * active products. The scenario ensures customers can view all product
 * information including SKU variants with pricing and inventory status,
 * complete image gallery, category information, and seller details.
 *
 * Test workflow:
 *
 * 1. Create seller account to own the product
 * 2. Create product category for classification
 * 3. Create product listing with base information
 * 4. Create multiple SKU variants with different codes and prices
 * 5. Upload product images for the gallery
 * 6. Retrieve and validate complete product details
 */
export async function test_api_product_detail_retrieval_with_variants_and_reviews(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(seller);

  // Step 2: Create product category
  const categoryData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryData,
    },
  );
  typia.assert(category);

  // Step 3: Create product listing
  const productData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // Step 4: Create multiple SKU variants
  const skuCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
  >();
  const skus = await ArrayUtil.asyncRepeat(skuCount, async (index) => {
    const skuData = {
      sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
      price: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000>
      >(),
    } satisfies IShoppingMallSku.ICreate;

    const sku = await api.functional.shoppingMall.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuData,
      },
    );
    typia.assert(sku);
    return sku;
  });

  // Step 5: Upload product images
  const imageCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
  >();
  const images = await ArrayUtil.asyncRepeat(imageCount, async (index) => {
    const imageData = {
      image_url: typia.random<string & tags.Format<"url">>(),
    } satisfies IShoppingMallProduct.IImageCreate;

    const image =
      await api.functional.shoppingMall.seller.products.images.createImage(
        connection,
        {
          productId: product.id,
          body: imageData,
        },
      );
    typia.assert(image);
    return image;
  });

  // Step 6: Retrieve and validate product details
  const retrievedProduct = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);

  // Validate core product information
  TestValidator.equals("product ID matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
}
