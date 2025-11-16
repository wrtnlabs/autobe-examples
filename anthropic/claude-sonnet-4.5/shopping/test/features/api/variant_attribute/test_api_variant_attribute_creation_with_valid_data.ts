import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test variant attribute creation with valid data.
 *
 * This test validates the complete workflow for creating a variant attribute
 * for a product sale. It ensures proper authentication flow between seller and
 * admin roles, category creation, sale creation, and finally variant attribute
 * creation with valid parameters.
 *
 * Workflow:
 *
 * 1. Authenticate as seller
 * 2. Switch to admin and create category
 * 3. Switch back to seller and create sale
 * 4. Create variant attribute with valid data
 * 5. Validate the created variant attribute
 */
export async function test_api_variant_attribute_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      business_name: `${RandomGenerator.name()} Business`,
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: `${RandomGenerator.name()} Store`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Authenticate as admin to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("+82"),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller authentication
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product sale as seller with comprehensive data
  const saleCode = RandomGenerator.alphaNumeric(12);
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        brand: RandomGenerator.name(1),
        condition: "new",
        short_description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 8,
        }),
        weight: typia.random<number>(),
        dimension_length: typia.random<number>(),
        dimension_width: typia.random<number>(),
        dimension_height: typia.random<number>(),
        manufacturer: RandomGenerator.name(2),
        return_policy_days: 30,
        warranty_info: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Create variant attribute for the sale
  const variantAttributeNames = ["Color", "Size", "Material", "Style"] as const;
  const attributeName = RandomGenerator.pick(variantAttributeNames);
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: attributeName,
          display_order: displayOrder,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 7: Validate the created variant attribute
  TestValidator.equals(
    "variant attribute name matches",
    variantAttribute.name,
    attributeName,
  );
  TestValidator.equals(
    "display_order matches input",
    variantAttribute.display_order,
    displayOrder,
  );
  TestValidator.predicate(
    "variant attribute ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      variantAttribute.id,
    ),
  );
  TestValidator.equals(
    "variant attribute is linked to sale",
    variantAttribute.shopping_mall_sale_id,
    sale.id,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      variantAttribute.created_at,
    ),
  );
  TestValidator.predicate(
    "attribute name within length limit",
    variantAttribute.name.length >= 1 && variantAttribute.name.length <= 100,
  );
  TestValidator.predicate(
    "display_order is non-negative",
    variantAttribute.display_order >= 0,
  );
  TestValidator.predicate(
    "sale summary exists",
    variantAttribute.sale !== null && variantAttribute.sale !== undefined,
  );
  TestValidator.equals(
    "sale summary ID matches",
    variantAttribute.sale.id,
    sale.id,
  );
}
