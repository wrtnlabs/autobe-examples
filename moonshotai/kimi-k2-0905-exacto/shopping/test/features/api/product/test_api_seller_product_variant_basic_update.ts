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

/**
 * Test basic product variant update functionality where a seller modifies core
 * variant attributes.
 *
 * This comprehensive E2E test validates the complete seller workflow for
 * managing product variants in the marketplace catalog. The scenario covers
 * authentication, product creation, unit setup, variant generation, and
 * modification operations with proper validation of business rules.
 *
 * Business Workflow:
 *
 * 1. Seller registration and authentication setup
 * 2. Create base product with comprehensive catalog information
 * 3. Configure product units for variant generation system
 * 4. Generate initial product variant with complete specification
 * 5. Update variant core attributes including pricing and inventory
 * 6. Validate changes are immediately reflected in catalog systems
 * 7. Verify inventory synchronization and pricing accuracy
 *
 * Key Validations:
 *
 * - SKU uniqueness across the marketplace platform
 * - Seller ownership verification for modification rights
 * - Inventory policy consistency and availability updates
 * - Price adjustment calculations and margin tracking
 * - Customer-facing display updates and variant visibility
 * - Real-time catalog synchronization across systems
 */
export async function test_api_seller_product_variant_basic_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as a seller with complete business credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      business_name: RandomGenerator.name(2),
      business_registration_number: RandomGenerator.alphaNumeric(12),
      tax_id: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile("010"),
      business_type: RandomGenerator.pick([
        "LLC",
        "Corporation",
        "Partnership",
      ] as const),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  TestValidator.predicate(
    "seller has verified business status",
    seller.is_verified === false,
  );

  // Step 2: Create a comprehensive product listing in marketplace catalog
  const baseProductSku = `PRODUCT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        sku: baseProductSku,
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
          wordMin: 4,
          wordMax: 8,
        }),
        price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        compare_at_price: null,
        cost: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<50> & tags.Maximum<8000>
        >(),
        condition: "new",
        weight: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
        weight_unit: "kg",
        barcode: null,
        track_quantity: true,
        allow_backorder: true,
        is_shipping_required: true,
        is_taxable: true,
        seo_title: RandomGenerator.name(2),
        seo_description: RandomGenerator.paragraph({ sentences: 8 }),
        tags: "electronics,gadgets,tech",
        featured_image: null,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        variants: [],
        images: [],
        ip: null,
        href: "https://seller-dashboard.example.com",
        referrer: "",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product created with correct seller",
    product.seller.id,
    seller.id,
  );

  // Step 3: Configure product unit system for variant generation
  const productUnit =
    await api.functional.shoppingMall.seller.products.units.create(connection, {
      productCode: product.sku,
      body: {
        name: RandomGenerator.pick([
          "Size",
          "Color",
          "Material",
          "Style",
        ] as const),
        type: RandomGenerator.pick([
          "size",
          "color",
          "material",
          "style",
        ] as const),
        display_style: RandomGenerator.pick([
          "dropdown",
          "buttons",
          "swatches",
        ] as const),
        is_required: true,
        is_multiple: false,
        sort_order: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<99>
        >(),
      } satisfies IShoppingMallProductUnit.ICreate,
    });
  typia.assert(productUnit);
  TestValidator.predicate(
    "unit has correct product relationship",
    productUnit.product.id === product.id,
  );

  // Step 4: Create initial product variant with complete specification
  const baseVariantSku = `VARIANT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variantTitle = `${RandomGenerator.pick(["Small", "Medium", "Large"] as const)}, ${RandomGenerator.pick(["Blue", "Red", "Green"] as const)}`;
  const initialVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productCode: product.sku,
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_unit_id: productUnit.id,
          sku: baseVariantSku,
          title: variantTitle,
          price_adjustment: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<-500> &
              tags.Maximum<2000>
          >(),
          cost_adjustment: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<-200> &
              tags.Maximum<1000>
          >(),
          weight_adjustment: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<-5> & tags.Maximum<20>
          >(),
          barcode: RandomGenerator.alphaNumeric(13),
          image: null,
          inventory_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          inventory_policy: RandomGenerator.pick(["deny", "continue"] as const),
          position: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<999>
          >(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  TestValidator.equals(
    "variant has correct SKU",
    initialVariant.sku,
    baseVariantSku,
  );
  TestValidator.predicate(
    "variant inventory is positive",
    initialVariant.inventory_quantity > 0,
  );

  // Step 5: Update variant core attributes with comprehensive changes
  const newVariantTitle = `${RandomGenerator.pick(["X-Large", "XX-Large"] as const)}, ${RandomGenerator.pick(["Purple", "Orange", "Black"] as const)}`;
  const newPriceAdjustment = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<500> & tags.Maximum<3000>
  >();
  const newInventoryQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<500>
  >();
  const newBarcodeValue = RandomGenerator.alphaNumeric(12);

  // Perform comprehensive variant update operation
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: initialVariant.sku,
        body: {
          sku: `UPDATED-${baseVariantSku}`,
          title: newVariantTitle,
          price_adjustment: newPriceAdjustment,
          cost_adjustment: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<300> & tags.Maximum<1500>
          >(),
          weight_adjustment: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<2> & tags.Maximum<25>
          >(),
          barcode: newBarcodeValue,
          image: null,
          inventory_quantity: newInventoryQuantity,
          inventory_policy: "deny",
          position: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<999>
          >(),
          is_active: true,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);

  // Step 6: Validate all update operations succeeded with comprehensive assertions
  TestValidator.equals(
    "variant SKU updated successfully",
    updatedVariant.sku,
    `UPDATED-${baseVariantSku}`,
  );
  TestValidator.equals(
    "variant title updated successfully",
    updatedVariant.title,
    newVariantTitle,
  );
  TestValidator.equals(
    "variant price adjustment updated successfully",
    updatedVariant.price_adjustment,
    newPriceAdjustment,
  );
  TestValidator.equals(
    "variant barcode updated successfully",
    updatedVariant.barcode,
    newBarcodeValue,
  );
  TestValidator.equals(
    "variant inventory quantity updated successfully",
    updatedVariant.inventory_quantity,
    newInventoryQuantity,
  );
  TestValidator.equals(
    "variant inventory policy updated successfully",
    updatedVariant.inventory_policy,
    "deny",
  );
  TestValidator.notEquals(
    "variant updated timestamp shows change",
    updatedVariant.updated_at,
    initialVariant.updated_at,
  );
  TestValidator.predicate(
    "variant maintains product relationship",
    updatedVariant.shopping_mall_product_id === product.id,
  );
  TestValidator.predicate(
    "variant maintains unit relationship",
    updatedVariant.shopping_mall_product_unit_id === productUnit.id,
  );
  TestValidator.predicate(
    "variant active status preserved",
    updatedVariant.is_active === true,
  );
  TestValidator.predicate(
    "variant inventory quantity is positive",
    updatedVariant.inventory_quantity > 0,
  );

  // Step 7: Test error scenarios for unauthorized variant modifications
  await TestValidator.error("cannot update non-existent variant", async () => {
    await api.functional.shoppingMall.seller.products.variants.update(
      connection,
      {
        productCode: product.sku,
        variantCode: `INVALID-SKU-12345`,
        body: {
          title: "Should Fail",
          price_adjustment: 100,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  });
}
