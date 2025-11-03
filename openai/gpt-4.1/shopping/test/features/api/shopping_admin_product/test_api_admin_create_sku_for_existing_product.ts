import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

/**
 * Validate admin workflow for creating a SKU under an existing product.
 *
 * 1. Register and authenticate a new admin.
 * 2. As admin, create a product that will host the new SKU.
 * 3. Create a SKU under that product, providing all required (sku_code, price,
 *    is_active, status, variant_attribute_value_ids) and optional (barcode)
 *    fields.
 * 4. Confirm that the returned SKU is linked to the correct product, business
 *    rules are enforced (including uniqueness of sku_code), and all audit
 *    information (created_at, updated_at, etc) is populated.
 * 5. Attempt to create a duplicate SKU (same sku_code) under the product; validate
 *    uniqueness constraint via error.
 */
export async function test_api_admin_create_sku_for_existing_product(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "operator",
      "compliance",
    ] as const),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 2. Create a product to hold the SKU
  const productCode = RandomGenerator.alphaNumeric(10);
  const productCreate = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    main_image_uri: `https://picsum.photos/seed/${RandomGenerator.alphaNumeric(8)}/800/800`,
    status: RandomGenerator.pick([
      "active",
      "draft",
      "archived",
      "under_review",
    ] as const),
    business_status: RandomGenerator.pick([
      "in_review",
      "approved",
      "rejected",
    ] as const),
    shipping_weight_grams: typia.random<number & tags.Minimum<0>>(),
    shipping_length_cm: typia.random<
      number & tags.Minimum<1> & tags.Maximum<999>
    >(),
    shipping_width_cm: typia.random<
      number & tags.Minimum<1> & tags.Maximum<999>
    >(),
    shipping_height_cm: typia.random<
      number & tags.Minimum<1> & tags.Maximum<999>
    >(),
    shipping_options: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingProduct.ICreate;
  const product: IShoppingProduct =
    await api.functional.shopping.admin.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);
  TestValidator.equals("product code matches", product.code, productCode);

  // 3. Prepare fake attribute values (since we don't have attribute APIs, simulate one based on the product model)
  // We'll simulate a single attribute value UUID to fulfill variant_attribute_value_ids' requirement
  const simulatedAttributeValueId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Create a SKU with all mandatory and optional fields
  const skuCode = RandomGenerator.alphaNumeric(12);
  const skuCreate = {
    sku_code: skuCode,
    price: typia.random<number & tags.Minimum<0>>(),
    is_active: true,
    barcode: RandomGenerator.alphaNumeric(13),
    status: "in_stock",
    variant_attribute_value_ids: [simulatedAttributeValueId],
  } satisfies IShoppingSku.ICreate;
  const sku: IShoppingSku =
    await api.functional.shopping.admin.products.skus.create(connection, {
      productCode: productCode,
      body: skuCreate,
    });
  typia.assert(sku);
  TestValidator.equals("SKU code matches input", sku.sku_code, skuCode);
  TestValidator.equals(
    "SKU product reference matches created product",
    sku.shopping_product_id,
    product.id,
  );
  TestValidator.equals("SKU is active", sku.is_active, true);
  TestValidator.predicate(
    "SKU created_at is ISO date",
    typeof sku.created_at === "string" &&
      sku.created_at.includes("T") &&
      sku.created_at.includes(":"),
  );
  // Validate audit details
  TestValidator.predicate(
    "SKU has audit updated_at",
    typeof sku.updated_at === "string",
  );

  // 5. Attempt to create a duplicate SKU with the same sku_code under the same product
  await TestValidator.error(
    "should not allow duplicate sku_code for same product",
    async () => {
      await api.functional.shopping.admin.products.skus.create(connection, {
        productCode: productCode,
        body: {
          ...skuCreate,
          sku_code: skuCode,
        },
      });
    },
  );
}
