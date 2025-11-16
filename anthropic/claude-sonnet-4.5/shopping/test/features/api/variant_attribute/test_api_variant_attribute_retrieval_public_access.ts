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
 * Test retrieving variant attribute details without authentication to validate
 * public accessibility.
 *
 * This scenario confirms that variant attributes can be viewed by anyone
 * (buyers, sellers, admins, or unauthenticated users) to understand product
 * configuration options.
 *
 * Workflow steps:
 *
 * 1. Authenticate as admin and create category
 * 2. Authenticate as seller and create product sale
 * 3. Create variant attribute for the sale
 * 4. Retrieve the variant attribute WITHOUT authentication
 *
 * Validation points:
 *
 * - Variant attribute retrieval succeeds without authentication
 * - Response includes complete variant attribute details
 * - All fields are present: id, shopping_mall_sale_id, name, display_order,
 *   created_at
 * - Sale summary relationship is included
 * - Values array is included (may be empty if no values created yet)
 * - Attribute details match the created data
 */
export async function test_api_variant_attribute_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        image_url: typia.random<string & tags.Format<"uri">>(),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sale as seller
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 5: Create variant attribute for the sale
  const variantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Color",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 7: Retrieve variant attribute WITHOUT authentication
  const retrievedAttribute =
    await api.functional.shoppingMall.sales.variantAttributes.at(
      unauthConnection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
      },
    );
  typia.assert(retrievedAttribute);

  // Step 8: Validate response completeness
  TestValidator.equals(
    "retrieved attribute ID matches",
    retrievedAttribute.id,
    variantAttribute.id,
  );
  TestValidator.equals(
    "shopping_mall_sale_id matches",
    retrievedAttribute.shopping_mall_sale_id,
    variantAttribute.shopping_mall_sale_id,
  );
  TestValidator.equals(
    "attribute name matches",
    retrievedAttribute.name,
    variantAttribute.name,
  );
  TestValidator.equals(
    "display_order matches",
    retrievedAttribute.display_order,
    variantAttribute.display_order,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedAttribute.created_at,
    variantAttribute.created_at,
  );

  // Step 9: Validate sale summary relationship
  typia.assert(retrievedAttribute.sale);
  TestValidator.equals(
    "sale summary ID matches",
    retrievedAttribute.sale.id,
    sale.id,
  );
  TestValidator.equals(
    "sale code matches",
    retrievedAttribute.sale.code,
    sale.code,
  );

  // Step 10: Validate values array exists (may be empty)
  TestValidator.predicate(
    "values array exists",
    Array.isArray(retrievedAttribute.values),
  );
}
