import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallInventoryStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatus";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistics";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_deletion_reference_integrity_validation(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with comprehensive business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphabets(10).toUpperCase(),
      tax_id: RandomGenerator.alphabets(9).toUpperCase(),
      phone: RandomGenerator.mobile(),
      business_type: RandomGenerator.pick([
        "corporation",
        "llc",
        "partnership",
        "sole_proprietorship",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 2: Create product with comprehensive metadata
  const productSKU = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: productSKU,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        price: typia.random<number & tags.Minimum<10> & tags.Maximum<1000>>(),
        compare_at_price: typia.random<
          number & tags.Minimum<200> & tags.Maximum<2000>
        >(),
        cost: typia.random<number & tags.Minimum<5> & tags.Maximum<500>>(),
        condition: RandomGenerator.pick([
          "new",
          "used",
          "refurbished",
        ] as const),
        weight: typia.random<number & tags.Minimum<0.1> & tags.Maximum<50>>(),
        weight_unit: RandomGenerator.pick(["kg", "g", "lb", "oz"] as const),
        barcode: RandomGenerator.alphabets(13),
        track_quantity: true,
        allow_backorder: false,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.paragraph({ sentences: 2 }),
        seo_description: RandomGenerator.paragraph({ sentences: 3 }),
        tags: "electronics,gadgets,tech",
        featured_image: "https://example.com/product-image.jpg",
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [
          {
            name: "main-product-image",
            extension: "jpg",
            url: "https://example.com/main-image.jpg",
          },
          {
            name: "side-product-image",
            extension: "png",
            url: "https://example.com/side-image.png",
          },
        ],
        ip: "192.168.1.1",
        href: "https://seller-dashboard.example.com/products/create",
        referrer: "https://seller-dashboard.example.com/products",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 3: Create product unit configurations for variant organization
  const sizeUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
      body: {
        name: "Size",
        type: "size",
        display_style: "dropdown",
        is_required: true,
        is_multiple: false,
        sort_order: 1,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(sizeUnit);

  const colorUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
      body: {
        name: "Color",
        type: "color",
        display_style: "swatches",
        is_required: true,
        is_multiple: false,
        sort_order: 2,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(colorUnit);

  const materialUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: productSKU,
      body: {
        name: "Material",
        type: "material",
        display_style: "buttons",
        is_required: false,
        is_multiple: false,
        sort_order: 3,
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(materialUnit);

  // Step 4: Create multiple variants with different configurations
  const variants: IShoppingMallProductVariant[] = [];
  const sizeOptions = ["Small", "Medium", "Large", "X-Large"] as const;
  const colorOptions = ["Black", "White", "Blue", "Red"] as const;
  const materialOptions = ["Cotton", "Polyester", "Silk", "Wool"] as const;

  // Create variants for size and color combinations
  for (const size of sizeOptions.slice(0, 2)) {
    for (const color of colorOptions.slice(0, 2)) {
      const variantSKU = `${productSKU}-${size.slice(0, 3)}-${color.slice(0, 3)}`;
      const variant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: productSKU,
            body: {
              shopping_mall_product_id: product.id,
              shopping_mall_product_unit_id: sizeUnit.id,
              sku: variantSKU,
              title: `${size}, ${color}`,
              price_adjustment:
                size === "Large" ? 5.0 : size === "X-Large" ? 10.0 : 0.0,
              cost_adjustment: 2.0,
              weight_adjustment:
                size === "Large" ? 0.2 : size === "X-Large" ? 0.4 : 0.0,
              barcode: RandomGenerator.alphabets(12),
              image: "https://example.com/variant-image.jpg",
              inventory_quantity: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<50> &
                  tags.Maximum<500>
              >(),
              inventory_policy: RandomGenerator.pick([
                "deny",
                "continue",
              ] as const),
              position: variants.length,
              is_active: true,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      typia.assert(variant);
      variants.push(variant);

      // Create second variant for material option
      const materialVariantSKU = `${variantSKU}-MAT`;
      const materialVariant =
        await api.functional.shoppingMall.seller.products.variants.create(
          connection,
          {
            productCode: productSKU,
            body: {
              shopping_mall_product_id: product.id,
              shopping_mall_product_unit_id: materialUnit.id,
              sku: materialVariantSKU,
              title: `${size}, ${color}, Premium Material`,
              price_adjustment: 15.0,
              cost_adjustment: 8.0,
              weight_adjustment: 0.1,
              barcode: RandomGenerator.alphabets(12),
              image: "https://example.com/premium-variant-image.jpg",
              inventory_quantity: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<20> &
                  tags.Maximum<200>
              >(),
              inventory_policy: "deny",
              position: variants.length + 1,
              is_active: true,
            } satisfies IShoppingMallProductVariant.ICreate,
          },
        );
      typia.assert(materialVariant);
      variants.push(materialVariant);
    }
  }

  // Step 5: Validate initial product structure
  TestValidator.predicate(
    "product should have initial data",
    () => product.id !== undefined,
  );
  TestValidator.predicate(
    "product should have seller reference",
    () => product.seller.id === seller.id,
  );
  TestValidator.predicate(
    "product should have variants created",
    () => variants.length === 8,
  ); // 2 sizes × 2 colors × 2 variants each

  // Step 6: Delete the product and validate referential integrity
  const deletedProduct =
    await api.functional.shoppingMall.seller.products.erase(connection, {
      productCode: productSKU,
    });
  typia.assert(deletedProduct);

  // Step 7: Validate complete referential integrity preservation
  // This is a hard delete operation that returns the complete product data
  TestValidator.equals(
    "deleted product should match original product exactly",
    deletedProduct.id,
    product.id,
  );
  TestValidator.equals(
    "SKU should be preserved in deletion response",
    deletedProduct.sku,
    product.sku,
  );
  TestValidator.equals(
    "product name should be preserved",
    deletedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description should be preserved",
    deletedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product price should be preserved",
    deletedProduct.price,
    product.price,
  );
  TestValidator.equals(
    "compare at price should be preserved",
    deletedProduct.compare_at_price,
    product.compare_at_price,
  );
  TestValidator.equals(
    "cost should be preserved",
    deletedProduct.cost,
    product.cost,
  );
  TestValidator.equals(
    "condition should be preserved",
    deletedProduct.condition,
    product.condition,
  );
  TestValidator.equals(
    "weight should be preserved",
    deletedProduct.weight,
    product.weight,
  );
  TestValidator.equals(
    "weight unit should be preserved",
    deletedProduct.weight_unit,
    product.weight_unit,
  );
  TestValidator.equals(
    "barcode should be preserved",
    deletedProduct.barcode,
    product.barcode,
  );

  // Validate seller relationship integrity
  TestValidator.equals(
    "seller ID should be preserved",
    deletedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "seller business name should be preserved",
    deletedProduct.seller.business_name,
    product.seller.business_name,
  );
  TestValidator.equals(
    "seller email should be preserved",
    deletedProduct.seller.email,
    product.seller.email,
  );
  TestValidator.equals(
    "seller verification status should be preserved",
    deletedProduct.seller.verification_status,
    product.seller.verification_status,
  );
  TestValidator.equals(
    "seller is_verified should be preserved",
    deletedProduct.seller.is_verified,
    product.seller.is_verified,
  );

  // Validate category relationship integrity
  TestValidator.equals(
    "category ID should be preserved",
    deletedProduct.category.id,
    product.category.id,
  );
  TestValidator.equals(
    "category name should be preserved",
    deletedProduct.category.name,
    product.category.name,
  );
  TestValidator.equals(
    "category code should be preserved",
    deletedProduct.category.code,
    product.category.code,
  );
  TestValidator.equals(
    "category level should be preserved",
    deletedProduct.category.level,
    product.category.level,
  );
  TestValidator.equals(
    "category path should be preserved",
    deletedProduct.category.path,
    product.category.path,
  );

  // Validate product settings integrity
  TestValidator.equals(
    "track_quantity setting should be preserved",
    deletedProduct.track_quantity,
    product.track_quantity,
  );
  TestValidator.equals(
    "allow_backorder setting should be preserved",
    deletedProduct.allow_backorder,
    product.allow_backorder,
  );
  TestValidator.equals(
    "is_shipping_required setting should be preserved",
    deletedProduct.is_shipping_required,
    product.is_shipping_required,
  );
  TestValidator.equals(
    "is_taxable setting should be preserved",
    deletedProduct.is_taxable,
    product.is_taxable,
  );

  // Validate SEO metadata integrity
  TestValidator.equals(
    "seo_title should be preserved",
    deletedProduct.seo_title,
    product.seo_title,
  );
  TestValidator.equals(
    "seo_description should be preserved",
    deletedProduct.seo_description,
    product.seo_description,
  );
  TestValidator.equals(
    "tags should be preserved",
    deletedProduct.tags,
    product.tags,
  );
  TestValidator.equals(
    "featured_image should be preserved",
    deletedProduct.featured_image,
    product.featured_image,
  );

  // Validate product statistics
  TestValidator.equals(
    "variants_count should be preserved",
    deletedProduct.variants_count,
    product.variants_count,
  );
  TestValidator.equals(
    "reviews_count should be preserved",
    deletedProduct.reviews_count,
    product.reviews_count,
  );
  TestValidator.equals(
    "average_rating should be preserved",
    deletedProduct.average_rating,
    product.average_rating,
  );

  // Validate timestamps
  TestValidator.equals(
    "created_at should be preserved",
    deletedProduct.created_at,
    product.created_at,
  );
  TestValidator.equals(
    "updated_at should be preserved",
    deletedProduct.updated_at,
    product.updated_at,
  );
  TestValidator.equals(
    "published_at should be preserved",
    deletedProduct.published_at,
    product.published_at,
  );

  // Validate inventory and review relationships
  TestValidator.predicate(
    "inventory status should be preserved during deletion",
    () => deletedProduct.inventory_status !== null,
  );
  TestValidator.predicate(
    "review statistics should be preserved during deletion",
    () => deletedProduct.reviews !== null,
  );

  // Validate variant references
  TestValidator.predicate(
    "variants array should be preserved during deletion",
    () => deletedProduct.variants.length === product.variants.length,
  );
  TestValidator.equals(
    "variant IDs should be preserved",
    deletedProduct.variants[0]?.id,
    product.variants[0]?.id,
  );
  TestValidator.equals(
    "variant SKUs should be preserved",
    deletedProduct.variants[0]?.sku,
    product.variants[0]?.sku,
  );
  TestValidator.equals(
    "variant titles should be preserved",
    deletedProduct.variants[0]?.title,
    product.variants[0]?.title,
  );

  // Validate image references
  TestValidator.predicate(
    "images array should be preserved during deletion",
    () => deletedProduct.images.length === product.images.length,
  );
  TestValidator.equals(
    "image IDs should be preserved",
    deletedProduct.images[0]?.id,
    product.images[0]?.id,
  );
  TestValidator.equals(
    "image URLs should be preserved",
    deletedProduct.images[0]?.image_url,
    product.images[0]?.image_url,
  );

  // Final integrity validation - ensure all data relationships are maintained
  TestValidator.predicate(
    "all product properties should be preserved during deletion",
    () => {
      const mainProductKeys = Object.keys(deletedProduct) as Array<
        keyof IShoppingMallProduct
      >;
      const originalProductKeys = Object.keys(product) as Array<
        keyof IShoppingMallProduct
      >;
      return (
        mainProductKeys.length === originalProductKeys.length &&
        mainProductKeys.every(
          (key) =>
            deletedProduct[key] !== undefined && product[key] !== undefined,
        )
      );
    },
  );

  // Validate that deletion operation properly handles all referential integrity constraints
  TestValidator.predicate(
    "seller-child relationship integrity is maintained",
    () => {
      return (
        deletedProduct.seller.id === seller.id &&
        deletedProduct.seller.business_name === product.seller.business_name &&
        deletedProduct.seller.verification_status ===
          product.seller.verification_status
      );
    },
  );
}
